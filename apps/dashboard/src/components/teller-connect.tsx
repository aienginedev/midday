import { useConnectParams } from "@/hooks/use-connect-params";
import { useEffect, useState } from "react";
import type { TellerConnectOptions } from "teller-connect-react";
import { BankConnectButton } from "./bank-connect-button";

type Props = {
  id: string;
  onSelect: (id: string) => void;
};

export function TellerConnect({ id, onSelect }: Props) {
  const [institution, setInstitution] = useState<string | undefined>();
  const [isLoading, setLoading] = useState(false);
  const { setParams } = useConnectParams();

  useEffect(() => {
    if (institution) {
      setLoading(true);

      const teller = window.TellerConnect.setup({
        applicationId: process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID!,
        environment: process.env
          .NEXT_PUBLIC_TELLER_ENVIRONMENT as TellerConnectOptions["environment"],
        institution,
        onSuccess: (authorization) => {
          setParams({
            step: "account",
            provider: "teller",
            token: authorization.accessToken,
            enrollment_id: authorization.enrollment.id,
          });

          // track({
          //   event: LogEvents.ConnectBankAuthorized.name,
          //   channel: LogEvents.ConnectBankAuthorized.channel,
          //   provider: "teller",
          // });
        },
        onExit: () => {
          setParams({ step: "connect" });
          // track({
          //   event: LogEvents.ConnectBankCanceled.name,
          //   channel: LogEvents.ConnectBankCanceled.channel,
          //   provider: "teller",
          // });
          //   setParams({ step: "connect" });
        },
        onFailure: () => {
          setParams({ step: "connect" });
        },
      });

      // NOTE: Because we are configure Teller with institution we need to
      // Regenerate the SDK, and that gives us a white background, let's wait until it's fully loaded
      setTimeout(() => {
        setLoading(false);
        teller.open();
      }, 1000);
    }
  }, [institution]);

  return (
    <BankConnectButton
      onClick={() => {
        onSelect(id);
        setInstitution(id);
      }}
      isLoading={isLoading}
    />
  );
}
