import AcmeLogo from "@/app/ui/acme-logo";
import { Metadata } from "next";

import SignupForm from "../ui/sign-up-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regsiter",
};

export default function Page() {
  return (
    <main className="flex justify-center items-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md: -mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo />
          </div>
        </div>
        <SignupForm />
        <p className="px-6">Already have an account? <Link className="text-blue-400" href="/login">Login now </Link></p>
      </div>
    </main>
  );
}
