const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    if (key) env[key.trim()] = vals.join('=').trim();
  }
  return env;
}

async function sync() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey.includes('placeholder') || serviceKey.includes('your-service-role-key')) {
    console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local!');
    console.error('Please get your service_role secret key from Supabase Dashboard:');
    console.error('  -> Project Settings -> API -> Project API keys -> service_role (secret)');
    console.error('and paste it into .env.local under SUPABASE_SERVICE_ROLE_KEY=...\n');
    process.exit(1);
  }

  if (serviceKey.startsWith('sb_publishable_')) {
    console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is currently set to a publishable/anon key!');
    console.error('Publishable keys cannot bypass Row Level Security.');
    console.error('Please copy the secret "service_role" key from your Supabase Dashboard:');
    console.error('  -> Project Settings -> API -> service_role (secret)\n');
    process.exit(1);
  }

  console.log(`Connecting to Supabase project at ${url}...`);
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Read local store data
  const storePath = path.join(__dirname, '..', '.data', 'store.json');
  if (!fs.existsSync(storePath)) {
    console.error('Store file not found at', storePath);
    process.exit(1);
  }
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

  // 1. Sync Event Settings
  console.log('\n[1/5] Syncing event settings...');
  const { error: settingsErr } = await supabase.from('event_settings').upsert({
    id: 1,
    ordering_open: store.settings?.ordering_open ?? true,
    event_name: store.settings?.event_name || 'CampusBite Fest',
    announcement: store.settings?.announcement || 'Welcome to CampusBite!',
  });
  if (settingsErr) console.warn('  Warning on event_settings:', settingsErr.message);
  else console.log('  ✓ Event settings synced.');

  // 2. Sync Campuses
  console.log('\n[2/5] Syncing campuses...');
  const campusMap = new Map(); // name -> uuid
  const activeCampuses = (store.campuses || []).filter((c) => c.is_active !== false);

  for (const c of activeCampuses) {
    const { data: existing } = await supabase
      .from('campuses')
      .select('id, name')
      .eq('name', c.name)
      .maybeSingle();

    if (existing) {
      campusMap.set(c.name, existing.id);
      console.log(`  - Campus "${c.name}" already exists (${existing.id}).`);
    } else {
      const { data: inserted, error: campErr } = await supabase
        .from('campuses')
        .insert({ name: c.name, is_active: true })
        .select()
        .single();

      if (campErr) {
        console.warn(`  Failed to insert campus "${c.name}":`, campErr.message);
      } else if (inserted) {
        campusMap.set(c.name, inserted.id);
        console.log(`  ✓ Inserted campus "${c.name}" (${inserted.id}).`);
      }
    }
  }

  // 3. Sync Food Items and Variants
  console.log('\n[3/5] Syncing food items and serving variations...');
  for (const item of store.food_items || []) {
    let foodId = null;
    const { data: existingFood } = await supabase
      .from('food_items')
      .select('id, name')
      .eq('name', item.name)
      .maybeSingle();

    if (existingFood) {
      foodId = existingFood.id;
      console.log(`  - Food "${item.name}" already exists.`);
    } else {
      const { data: insertedFood, error: foodErr } = await supabase
        .from('food_items')
        .insert({
          name: item.name,
          description: item.description || '',
          image_url: item.image_url,
          category: item.category || 'Main Course',
          is_active: item.is_active ?? true,
        })
        .select()
        .single();

      if (foodErr) {
        console.warn(`  Failed to insert food "${item.name}":`, foodErr.message);
        continue;
      }
      foodId = insertedFood.id;
      console.log(`  ✓ Inserted food item "${item.name}".`);
    }

    if (!foodId || !item.variants) continue;

    for (const v of item.variants) {
      const { data: existingVar } = await supabase
        .from('food_variants')
        .select('id')
        .eq('food_item_id', foodId)
        .eq('name', v.name)
        .maybeSingle();

      if (!existingVar) {
        await supabase.from('food_variants').insert({
          food_item_id: foodId,
          name: v.name,
          purchase_cost: v.purchase_cost || 0,
          selling_price: v.selling_price || 0,
          is_active: v.is_active ?? true,
        });
        console.log(`    ✓ Added variant "${v.name}" (Selling: ₹${v.selling_price}).`);
      }
    }
  }

  // 4. Sync Auth Users & Profiles
  console.log('\n[4/5] Syncing profiles and login accounts...');
  for (const p of store.profiles || []) {
    try {
      // Check if user exists in auth
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = (userList?.users || []).find((u) => u.email === p.email);

      let userId = existingUser?.id;

      if (!existingUser) {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: p.email,
          password: p.password || 'CampusBite123',
          email_confirm: true,
          user_metadata: {
            full_name: p.full_name,
            role: p.role,
          },
        });

        if (createErr) {
          console.warn(`  Could not create auth account for ${p.email}:`, createErr.message);
          continue;
        }
        userId = newUser.user.id;
        console.log(`  ✓ Created Supabase Auth user: ${p.email} (${p.role})`);
      } else {
        console.log(`  - Auth user already exists: ${p.email}`);
      }

      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          role: p.role,
          full_name: p.full_name,
          email: p.email,
          is_active: p.is_active ?? true,
        });
        console.log(`    ✓ Upserted profile record for ${p.full_name}`);
      }
    } catch (authErr) {
      console.warn(`  Error syncing user ${p.email}:`, authErr.message);
    }
  }

  console.log('\n======================================================');
  console.log('✅ Supabase synchronization completed successfully!');
  console.log('Your website is now storing all data live in Supabase PostgreSQL.');
  console.log('======================================================\n');
}

sync().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
