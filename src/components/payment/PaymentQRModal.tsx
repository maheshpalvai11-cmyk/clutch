'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Check,
  Copy,
  Smartphone,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoneNewOrder: () => void;
  amount: number;
  teamName: string;
  campusName?: string;
  orderId?: string;
}

export function PaymentQRModal({
  isOpen,
  onClose,
  onDoneNewOrder,
  amount,
  teamName,
  campusName,
  orderId,
}: PaymentQRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const phoneNumber = '6305863399';
  const payeeName = 'PALVAI MAHESH';
  const upiLink = `upi://pay?pa=6305863399@ybl&pn=PALVAI%20MAHESH&am=${amount}&cu=INR`;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
        {/* Purple / PhonePe Themed Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-4 text-white text-center relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold mb-1 backdrop-blur-xs">
            <QrCode className="w-3.5 h-3.5" />
            <span>PhonePe &bull; Instant UPI Payment</span>
          </div>

          <h3 className="text-lg font-black tracking-tight text-white">
            Scan &amp; Pay to Confirm Order
          </h3>
          <p className="text-purple-200 text-xs mt-0.5">
            Student pays directly to organizer via PhonePe / GPay / Paytm
          </p>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Bill Amount Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-3.5 text-center shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
              Total Order Bill Amount
            </span>
            <div className="text-3xl font-black text-slate-900 mt-0.5 tracking-tight">
              {formatINR(amount)}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Team: <strong>{teamName || 'Student Team'}</strong>
              </span>
              {campusName && (
                <>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-500">{campusName}</span>
                </>
              )}
            </div>
            {orderId && (
              <span className="inline-block mt-1 text-[10px] text-purple-600 font-mono bg-purple-100/70 px-2 py-0.5 rounded-md">
                Order ID: #{orderId}
              </span>
            )}
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm max-w-[240px] sm:max-w-[260px] w-full">
              {/* PhonePe QR image uploaded by user */}
              <div className="relative w-full aspect-[1/1.9] rounded-lg overflow-hidden bg-white">
                <Image
                  src="/phonepe-qr.jpg"
                  alt="PhonePe QR Code - Palvai Mahesh 6305863399"
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 640px) 240px, 260px"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Point any UPI scanner app (PhonePe, Google Pay, Paytm, BHIM) at this QR
            </p>
          </div>

          {/* Payee Info & Number Copy */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Beneficiary Name
                </span>
                <span className="font-bold text-slate-800">{payeeName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  UPI / Phone Number
                </span>
                <span className="font-black text-purple-700 text-sm tracking-wide">
                  {phoneNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyNumber}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Phone Number Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Phone Number</span>
                  </>
                )}
              </button>

              <a
                href={upiLink}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] transition-colors"
                title="Tap to pay via mobile UPI app"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open UPI App</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
          {/* Big Green Primary "Done - Back to New Order" Button */}
          <button
            type="button"
            onClick={onDoneNewOrder}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>Payment Done &bull; Back to New Order</span>
          </button>

          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
            >
              Close Window
            </button>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Verified PhonePe Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
