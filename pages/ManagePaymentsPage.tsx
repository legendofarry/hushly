import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PaymentRequest, UserProfile } from "../types";
import {
  OWNER_EMAIL,
  approvePayment,
  listenToPendingPaymentRequests,
  rejectPayment,
} from "../services/paymentService";

interface Props {
  user: UserProfile;
}

const ManagePaymentsPage: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToPendingPaymentRequests(
      (items) => {
        setRequests(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: PaymentRequest) => {
    setBusyId(request.id);
    try {
      await approvePayment({ request, ownerEmail: OWNER_EMAIL });
    } catch (err) {
      console.error(err);
      setError("Unable to approve payment.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: PaymentRequest) => {
    setBusyId(request.id);
    try {
      await rejectPayment({ request, ownerEmail: OWNER_EMAIL });
    } catch (err) {
      console.error(err);
      setError("Unable to reject payment.");
    } finally {
      setBusyId(null);
    }
  };

  if (user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return (
      <div className="min-h-screen bg-kipepeo-dark text-white flex items-center justify-center">
        <p className="text-gray-500 text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/profile"
            className="text-2xl active:scale-90 transition-transform"
          ></Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">
              Manage Payments
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
              Pending verification
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500 text-base">
            Loading payment requests...
          </div>
        ) : (
          <>
            {error && (
              <div className="glass rounded-2xl border border-red-500/20 p-4 text-sm text-red-300">
                {error}
              </div>
            )}
            {requests.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-base">
                No pending payments right now.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="glass rounded-2xl border border-white/5 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-kipepeo-pink">
                          {request.nickname ?? "User"}
                        </p>
                        <p className="text-xs text-gray-500">{request.email}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        Pending
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap bg-black/30 border border-white/5 rounded-xl p-3">
                      {request.mpesaMessageProof}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={busyId === request.id}
                        className="flex-1 py-3 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest text-xs font-black active:scale-95 transition-transform disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        disabled={busyId === request.id}
                        className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 uppercase tracking-widest text-xs font-black active:scale-95 transition-transform disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagePaymentsPage;
