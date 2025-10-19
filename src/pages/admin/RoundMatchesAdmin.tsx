import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import ProfileMatchCard from "../../components/ProfileMatchCard";
import { AdminHeader } from "./AdminHome";

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
  const { roundId } = useParams();
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
            boy: boyDoc.exists() ? (boyDoc.data() as UserDoc) : null,
            girl: girlDoc.exists() ? (girlDoc.data() as UserDoc) : null,
            match: m,
          };
        })
      );
      setMatchPairs(pairs);
    };
    fetchData();
  }, [roundId]);

  return (
    <div className="container">
      <AdminHeader current="rounds" />
      <h2>Matches for Round: {roundId}</h2>
      {matchPairs.length === 0 ? (
        <div>No matches yet.</div>
      ) : (
        <div className="match-card-grid">
          {matchPairs.map((pair, i) => (
            <div className="match-card" key={i}>
              <div style={{ display: "flex", gap: 16 }}>
                <ProfileMatchCard {...{ ...pair.boy, name: pair.boy?.name ?? "No Boy Profile", collegeId: pair.boy?.collegeId }} />
                <ProfileMatchCard {...{ ...pair.girl, name: pair.girl?.name ?? "No Girl Profile", collegeId: pair.girl?.collegeId }} />
                <div className="match-meta" style={{ marginLeft: "auto", alignSelf: "center" }}>
                  <span>
                    {pair.match.timestamp
                      ? new Date(pair.match.timestamp.seconds * 1000).toLocaleString()
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}