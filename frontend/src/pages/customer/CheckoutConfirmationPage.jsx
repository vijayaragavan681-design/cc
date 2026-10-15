import React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Printer,
  ShoppingBag,
  ArrowRight,
  Receipt,
  Store,
  Calendar,
  Layers,
} from "lucide-react";

export const CheckoutConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bill = location.state?.bill;

  if (!bill) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No recent transaction</h2>
        <p className="text-xs text-slate-500">
          You have not completed a purchase in this session.
        </p>
        <Link
          to="/products"
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Success Badge */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Purchase Successful!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Stock has been conditionally deducted from store inventory with FEFO batch allocations.
        </p>
      </div>

      {/* Printable Receipt Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-6 print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tax Invoice / Receipt
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-mono">{bill.saleId}</h2>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
            <div><strong>Store:</strong> {bill.storeId}</div>
            <div><strong>Date:</strong> {bill.saleTimestamp}</div>
            <div><strong>Customer ID:</strong> {bill.customerId}</div>
          </div>
        </div>

        {/* Purchased Items Table */}
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item & Batch Allocation</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.productId}</div>

                      {/* Display FEFO Batch Allocations */}
                      {item.batchDeductions && item.batchDeductions.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {item.batchDeductions.map((bd, bIdx) => (
                            <div
                              key={bIdx}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-flex items-center space-x-1.5 mr-2"
                            >
                              <Layers className="w-3 h-3 text-emerald-600" />
                              <span>
                                Batch: <strong>{bd.batchId}</strong> ({bd.quantity} units)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">${bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (8%):</span>
                <span className="font-semibold">${bill.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-base text-slate-900">
                <span>Total Paid:</span>
                <span className="text-emerald-700">${bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-2 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Receipt</span>
          </button>

          <div className="flex items-center space-x-3">
            <Link
              to="/my-bills"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              View My Bills
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
