"use client";

import { updateInstitutionUsageAction } from "@/actions/institutions/update-institution-usage";
import { useConnectParams } from "@/hooks/use-connect-params";
import { useAction } from "next-safe-action/hooks";
import { PlaidConnect } from "./plaid-connect";
import { TellerConnect } from "./teller-connect";

export function ConnectBankProvider({ provider, id }) {
  const { setParams } = useConnectParams();
  const updateInstitutionUsage = useAction(updateInstitutionUsageAction);

  const updateUsage = () => {
    updateInstitutionUsage.execute({ institutionId: id });
  };

  switch (provider) {
    case "teller":
      return (
        <TellerConnect
          id={id}
          onSelect={() => {
            // NOTE: Wait for Teller sdk to be configured
            setTimeout(() => {
              setParams({ step: null });
            }, 950);

            updateUsage();
          }}
        />
      );
    case "plaid": {
      return (
        <PlaidConnect
          id={id}
          onSelect={() => {
            setParams({ step: null });
            updateUsage();
          }}
        />
      );
    }

    case "gocardless": {
      return null;
    }
    default:
      return null;
  }
}
