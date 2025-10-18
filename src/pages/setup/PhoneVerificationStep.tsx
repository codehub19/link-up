// import React, { useState } from "react";
// import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// import { db } from "../../firebase";
// import { doc, updateDoc } from "firebase/firestore";
// import { useAuth } from "../../state/AuthContext";

// type Props = {
//   onVerified: (phoneNumber: string) => void;
// };

// export default function PhoneVerificationStep({ onVerified }: Props) {
//   const { user } = useAuth();
//   const [phone, setPhone] = useState("");
//   const [code, setCode] = useState("");
//   const [confirmation, setConfirmation] = useState<any>(null);
//   const [sending, setSending] = useState(false);
//   const [verifying, setVerifying] = useState(false);
//   const [error, setError] = useState<string | null>(null);


  
//   // Helper to initialize verifier only once
//   const setupRecaptcha = () => {
//     if (!window.recaptchaVerifier) {
//       const auth = getAuth();
//       window.recaptchaVerifier = new RecaptchaVerifier(
//         "recaptcha-container",
//         { size: "invisible" },
//         auth
//       );
//     }
//   };

//   const sendCode = async () => {
//     setError(null);
//     if (!phone.match(/^\+91\d{10}$/)) {
//       setError("Enter a valid Indian phone number with country code (+91)");
//       return;
//     }
//     setSending(true);
//     try {
//       setupRecaptcha();
//       const auth = getAuth();
//       const appVerifier = window.recaptchaVerifier;
//       await appVerifier.render();
//       const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
//       setConfirmation(confirmationResult);
//     } catch (e: any) {
//       setError(e.message || "Failed to send code.");
//     }
//     setSending(false);
//   };

//   const verifyCode = async () => {
//     setVerifying(true);
//     setError(null);
//     try {
//       await confirmation.confirm(code);
//       // Save phone to backend
//       if (user) {
//         await updateDoc(doc(db, "users", user.uid), { phoneNumber: phone });
//       }
//       onVerified(phone);
//     } catch (e: any) {
//       setError(e.message || "Invalid code.");
//     }
//     setVerifying(false);
//   };

//   return (
//     <div className="setup-card setup-card-glass">
//       <h1 className="setup-title">Verify Your Phone Number</h1>
//       <p className="setup-sub">Enter your mobile number and verify with OTP.</p>
//       <label className="field">
//         <span className="field-label">Phone Number</span>
//         <input
//           className="field-input"
//           value={phone}
//           onChange={e => setPhone(e.target.value)}
//           placeholder="+919876543210"
//           disabled={!!confirmation}
//         />
//       </label>
//       {confirmation && (
//         <label className="field">
//           <span className="field-label">OTP</span>
//           <input
//             className="field-input"
//             value={code}
//             onChange={e => setCode(e.target.value)}
//             placeholder="Enter OTP"
//           />
//         </label>
//       )}
//       <div>
//         {!confirmation ? (
//           <button className="btn-gradient" onClick={sendCode} disabled={sending}>
//             {sending ? "Sending..." : "Send OTP"}
//           </button>
//         ) : (
//           <button className="btn-gradient" onClick={verifyCode} disabled={verifying}>
//             {verifying ? "Verifying..." : "Verify"}
//           </button>
//         )}
//       </div>
//       {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
//     </div>
//   );
// }