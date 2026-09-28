import React from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from './AppLayout'
import { useSeo } from '../../utils/seo'
import { LEGAL } from '../../config/legal'

const Sec = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="text-xl font-bold text-white mb-3">{n}. {title}</h3>
    <div className="text-gray-400 space-y-3 leading-relaxed">{children}</div>
  </section>
)

export default function TermsOfService() {
  useSeo({ title: 'Terms of Service', description: 'The terms that apply when you use DateU to make friends, join events, call and date.', path: '/legal/terms' })
  const g = LEGAL.grievance
  return (
    <PageWrapper title="Terms of Service">
      <p className="text-sm text-gray-500 mb-6 font-mono">Last updated: {LEGAL.termsUpdated}</p>
      <p className="text-gray-300 mb-8 leading-relaxed">
        These terms are an agreement between you and DateU ({LEGAL.businessName}{LEGAL.address ? `, ${LEGAL.address}` : ''}).
        They apply when you use dateu.in or the DateU app (“DateU”). By creating an account you agree to them and to our{' '}
        <Link className="text-rose-400" to="/legal/privacy">Privacy Policy</Link> and{' '}
        <Link className="text-rose-400" to="/legal/guidelines">Community Guidelines</Link>.
      </p>

      <div className="space-y-8">
        <Sec n={1} title="What DateU is">
          <p>
            DateU is a social app for college students to make new friends — from their own campus and every other college —
            find people to go to events with, join interest groups, talk on voice calls and, only if they choose to turn it on, date.
          </p>
        </Sec>

        <Sec n={2} title="Who can use DateU">
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be <strong className="text-gray-200">18 or older</strong>. We remove accounts of anyone younger.</li>
            <li>You must give true information about yourself — your real name, age, gender and college — and use your own photos.</li>
            <li>One account per person. You must not use DateU if we have banned you before.</li>
            <li>You are responsible for keeping your sign-in secure.</li>
          </ul>
        </Sec>

        <Sec n={3} title="How you must behave">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Harass, threaten, bully, stalk or discriminate against anyone, or keep contacting someone who has said no or blocked you.</li>
            <li>Post or send nudity, sexual content without consent, violence, hate speech, or anything illegal.</li>
            <li>Pretend to be someone else, create fake profiles, or misrepresent your college.</li>
            <li>Sell anything, promote other services, spam, scam, or ask others for money.</li>
            <li>Record calls or share someone’s messages, photos or personal details without their permission.</li>
            <li>Scrape, copy or reverse-engineer DateU, or interfere with how it works.</li>
          </ul>
          <p>
            Anything you post (photos, bio, prompts, group posts, messages) must be yours to share. You keep ownership of it and give us
            a licence to store and show it to other members so DateU can work. We check profile photos automatically and may remove content that breaks these terms.
          </p>
        </Sec>

        <Sec n={4} title="Friends, events, groups and calls">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-gray-200">Friends:</strong> suggestions are based on things like shared interests and events. We don’t guarantee any number of friends or replies.</li>
            <li><strong className="text-gray-200">Events:</strong> events are organised by DateU, colleges or partners. Joining an event on DateU doesn’t reserve a place at the venue unless the event says so. Tickets bought from an organiser are governed by the organiser’s terms.</li>
            <li><strong className="text-gray-200">Calls:</strong> voice calls are live and not recorded by us. Leave any call that makes you uncomfortable and report it.</li>
            <li><strong className="text-gray-200">Dating (optional):</strong> only people who turn dating on see each other’s dating profiles and take part in matching rounds.</li>
          </ul>
        </Sec>

        <Sec n={5} title="Meeting people">
          <p>
            DateU checks college IDs for the verified badge but does not do background checks. You are responsible for your own safety
            when talking to or meeting people. Meet in public places, tell a friend where you are going, and report anyone who makes you feel unsafe.
          </p>
        </Sec>

        <Sec n={6} title="Reports, blocks and enforcement">
          <p>
            You can block or report anyone. We review reports, aim to act within 24 hours and tell you the outcome. We may hide a profile
            while we review it, remove content, limit features, or suspend or ban an account that breaks these terms, and we may tell the police
            where someone may be in danger or the law requires it. If you think we made a mistake, write to our Grievance Officer (section 11).
          </p>
        </Sec>

        <Sec n={7} title="Premium and payments">
          <p>
            DateU is free. DateU Premium is optional and gives extra features for the period shown on the plan (for example priority in
            matching rounds and random calls, more visibility in suggestions, and seeing who viewed your profile). Premium does not guarantee
            any number of friends, matches, replies or dates and does not renew automatically. Refunds follow our{' '}
            <Link className="text-rose-400" to="/legal/refunds">Refund &amp; Cancellation Policy</Link>.
          </p>
        </Sec>

        <Sec n={8} title="Deleting your account">
          <p>
            You can delete your account any time from Settings → Delete account. Your profile is hidden at once and your data is permanently
            deleted within {LEGAL.deletionDays} days, as described in the Privacy Policy. We may also close accounts that break these terms.
          </p>
        </Sec>

        <Sec n={9} title="Our role and liability">
          <p>
            DateU is an intermediary under the Information Technology Act, 2000: members create the content and conversations on it.
            We work hard to keep DateU running and safe, but we provide it “as is” and can’t promise it will always be available or error-free.
          </p>
          <p>
            To the extent Indian law allows, we are not liable for the conduct of other members, on or off DateU, or for indirect losses.
            Nothing in these terms limits liability that cannot be limited by law. You agree to cover our losses if you use DateU in a way that
            breaks these terms or the law.
          </p>
        </Sec>

        <Sec n={10} title="Changes">
          <p>We may update DateU and these terms. If a change is important we’ll tell you in the app before it applies. If you keep using DateU after that, the new terms apply.</p>
        </Sec>

        <Sec n={11} title="Grievance Officer and contact">
          <p>
            For complaints about content, another member, or these terms, contact our Grievance Officer{g.name ? <>, <strong className="text-gray-200">{g.name}</strong></> : ''}, at{' '}
            <a className="text-rose-400" href={`mailto:${g.email}`}>{g.email}</a>. We acknowledge complaints within {g.ackHours} hours and resolve them within {g.resolveDays} days.
            For anything else, write to <a className="text-rose-400" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
          </p>
        </Sec>

        <Sec n={12} title="Governing law">
          <p>These terms are governed by the laws of India. Courts in New Delhi have jurisdiction over any dispute, after we have first tried to resolve it with you through the grievance process.</p>
        </Sec>
      </div>
    </PageWrapper>
  )
}
