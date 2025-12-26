import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import ProfileMatchCard from "../../components/ProfileMatchCard";


type UserDoc = {
  uid: string;
  name?: string;
  instagramId?: string;
  photoUrl?: string;
  bio?: string;
  college?: string;
  interests?: string[];
  collegeId?: { verified?: boolean };
};

type MatchDoc = {
  boyUid: string;
  girlUid: string;
  timestamp?: { seconds: number };
};

export default function RoundMatchesAdmin() {
  const { roundId } = useParams<{ roundId?: string }>();
  const [matchPairs, setMatchPairs] = useState<
    { boy: UserDoc | null; girl: UserDoc | null; match: MatchDoc }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!roundId) return;
      const matchSnap = await getDocs(
        query(collection(db, "matches"), where("roundId", "==", roundId))
      );
      const matches: MatchDoc[] = matchSnap.docs.map((d) => d.data() as MatchDoc);

      // Fetch both boy and girl profiles for each match
      const pairs = await Promise.all(
        matches.map(async (m) => {
          const boyDoc = await getDoc(doc(db, "users", m.boyUid));
          const girlDoc = await getDoc(doc(db, "users", m.girlUid));
          return {
            boy: boyDoc.exists() ? { ...(boyDoc.data() as UserDoc), uid: m.boyUid } : null,
            girl: girlDoc.exists() ? { ...(girlDoc.data() as UserDoc), uid: m.girlUid } : null,
            match: m,
          };
        })
      );
      setMatchPairs(pairs);
    };
    fetchData();
  }, [roundId]);

  return (
    <div className="admin-container">
      <div className="row" style={{ alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <h2 style={{ margin: 0 }}>Matches for Round: <span className="text-primary">{roundId}</span></h2>
      </div>

      {matchPairs.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: 'var(--admin-text-muted)' }}>
          No matches found for this round.
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(600px, 1fr))', gap: 24 }}>
          {matchPairs.map((pair, i) => (
            <div className="admin-card" key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row" style={{ padding: 12, background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted)' }}>PAIR #{i + 1}</span>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {pair.match.timestamp ? new Date(pair.match.timestamp.seconds * 1000).toLocaleString() : ""}
                </span>
              </div>
              <div className="row" style={{ padding: 16, alignItems: 'center', justifyContent: 'space-around' }}>
                {/* Boy Profile */}
                {pair.boy && (
                  <div style={{ transform: 'scale(0.9)' }}>
                    <ProfileMatchCard user={pair.boy} />
                  </div>
                )}

                {/* Match Indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
                    ❤️
                  </div>
                  <span className="badge badge-success">Matched</span>
                </div>

                {/* Girl Profile */}
                {pair.girl && (
                  <div style={{ transform: 'scale(0.9)' }}>
                    <ProfileMatchCard user={pair.girl} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}