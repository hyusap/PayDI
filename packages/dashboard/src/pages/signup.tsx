import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const SignupPage: NextPage = () => {
  const [merchantName, setMerchantName] = useState("");
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div style={styles.container}>
      <Head>
        <title>Create Account — AdiPay</title>
        <meta name="description" content="Create your AdiPay merchant account" />
      </Head>

      {/* Left Panel */}
      <div style={styles.leftPanel}>
        {/* Logo / Header area */}
        <div style={styles.logoArea}>
          <div style={styles.logoBox} />
          <div>
            <div style={styles.logoTitle}>Check out with ADI</div>
            <div style={styles.logoSubtitle}>
              Accept crypto payments, priced in fiat.
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div style={styles.formSection}>
          <div style={styles.badge}>Getting started</div>
          <h1 style={styles.heading}>Create your account</h1>

          <label style={styles.label}>Merchant name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="ADI Foundation"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />

          {/* Connect wallet button */}
          <button style={styles.connectBtn} onClick={openConnectModal}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M21 7H3C2.44772 7 2 7.44772 2 8V19C2 19.5523 2.44772 20 3 20H21C21.5523 20 22 19.5523 22 19V8C22 7.44772 21.5523 7 21 7Z"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 14C16 14.5523 16.4477 15 17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14Z"
                fill="black"
              />
              <path
                d="M2 10H22M7 7V5C7 4.44772 7.44772 4 8 4H16C16.5523 4 17 4.44772 17 5V7"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>{isConnected ? shortAddress : "Connect wallet"}</span>
          </button>

          {/* Continue button */}
          <button
            style={{
              ...styles.continueBtn,
              opacity: isConnected ? 1 : 0.5,
              cursor: isConnected ? "pointer" : "not-allowed",
            }}
            disabled={!isConnected}
          >
            <span>Continue</span>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M5 12H19M19 12L13 6M19 12L13 18"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Geist', system-ui, sans-serif",
    background: "#fff",
  },
  leftPanel: {
    width: "50%",
    minWidth: 480,
    background: "#fff",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  rightPanel: {
    flex: 1,
    background:
      "linear-gradient(160deg, #fde8c0 0%, #e8c87a 20%, #c8a040 35%, #9060c0 60%, #3040c8 80%, #0020a0 100%)",
    minHeight: "100vh",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "56px 0 0 156px",
  },
  logoBox: {
    width: 42,
    height: 42,
    background: "#eee",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: 17.46,
    fontWeight: 400,
    color: "#000",
    letterSpacing: -0.17,
    lineHeight: 1.3,
  },
  logoSubtitle: {
    fontSize: 11.64,
    color: "rgba(0,0,0,0.5)",
    letterSpacing: -0.12,
    lineHeight: 1.4,
    maxWidth: 225,
  },
  formSection: {
    padding: "200px 0 0 156px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: 443,
  },
  badge: {
    background: "#f7f7f7",
    padding: "8px 16px",
    fontSize: 13.23,
    color: "rgba(0,0,0,0.5)",
    lineHeight: 1,
    marginBottom: 28,
  },
  heading: {
    fontSize: 33,
    fontWeight: 400,
    color: "#000",
    letterSpacing: -0.33,
    margin: "0 0 48px 0",
    lineHeight: 1.2,
  },
  label: {
    fontSize: 16,
    fontWeight: 400,
    color: "#000",
    letterSpacing: -0.16,
    marginBottom: 10,
    display: "block",
  },
  input: {
    width: 443,
    height: 56,
    border: "1px solid rgba(29,41,54,0.2)",
    borderRadius: 4,
    padding: "11px 20px",
    fontSize: 16,
    color: "rgba(0,0,0,0.3)",
    fontFamily: "'Geist', system-ui, sans-serif",
    background: "#fff",
    marginBottom: 20,
    outline: "none",
    boxSizing: "border-box",
  },
  connectBtn: {
    width: 443,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    background: "rgba(0,60,255,0.05)",
    border: "1px solid rgba(0,60,255,0.1)",
    borderRadius: 4,
    padding: "11px 79px",
    fontSize: 20,
    fontWeight: 400,
    color: "#000",
    letterSpacing: -0.2,
    cursor: "pointer",
    marginBottom: 20,
    fontFamily: "'Geist', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  continueBtn: {
    width: 443,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    background: "#003cff",
    border: "none",
    borderRadius: 4,
    padding: "11px 79px",
    fontSize: 20,
    fontWeight: 400,
    color: "#fff",
    letterSpacing: -0.2,
    fontFamily: "'Geist', system-ui, sans-serif",
    boxSizing: "border-box",
  },
};

export default SignupPage;
