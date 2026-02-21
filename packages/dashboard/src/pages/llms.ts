import type { GetServerSideProps } from "next";

import { LLMS_INSTRUCTIONS } from "../lib/llmsInstructions";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(LLMS_INSTRUCTIONS);
  res.end();
  return { props: {} };
};

export default function LLMSPage() {
  return null;
}
