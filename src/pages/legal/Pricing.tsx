import React from "react";
import { Link } from "react-router-dom";
import { PageWrapper } from "./AppLayout";

export default function Pricing() {
  return (
    <PageWrapper title="Pricing">
      <p className="text-gray-300 mb-8 leading-relaxed">
        DateU is free to join and free to use. Matching rounds, random voice calls and chat are open to everyone.
        Premium is optional: it puts you first, so more people see you — it improves your chances, but it doesn't
        guarantee a match, because every match depends on both people choosing each other.
      </p>

      <div className="grid gap-6">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-rose-400 mb-2">Free for everyone</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-300 text-sm leading-relaxed">
            <li>Join every matching round and get curated profile suggestions</li>
            <li>Random voice calls (daily limit applies)</li>
            <li>24 hours of free chat after a mutual like on a call</li>
            <li>Unlimited chat with people you match with in rounds</li>
          </ul>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-violet-400 mb-2">Premium — priority for a set period</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-300 text-sm leading-relaxed">
            <li>Shown first to women in every round</li>
            <li>More profile suggestions each round</li>
            <li>Paired first in random calls, with more calls per day</li>
            <li>Keep chatting after the 24-hour window on call connections</li>
          </ul>
          <p className="text-gray-400 text-sm mt-4 leading-relaxed">
            Premium lasts for the number of days shown on the plan (for example 30 days) and ends automatically — there are
            no automatic renewals. Buying again while Premium is active extends it. Current prices are shown in the app on the
            Premium page.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-2">No guaranteed matches</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          Premium improves your visibility; it does not promise any number of matches, replies or dates.
          Payments are non-refundable once Premium is activated, except as described in our{" "}
          <Link to="/legal/refunds" className="text-rose-400 hover:text-rose-300">Refund &amp; Cancellation Policy</Link>.
        </p>
      </div>
    </PageWrapper>
  );
}
