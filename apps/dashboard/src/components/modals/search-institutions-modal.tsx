"use client";

import { createPlaidLinkTokenAction } from "@/actions/institutions/create-plaid-link";
import { exchangePublicToken } from "@/actions/institutions/exchange-public-token";
import { getInstitutions } from "@/actions/institutions/get-institutions";
import { useConnectParams } from "@/hooks/use-connect-params";
import type { Institutions } from "@midday-ai/engine/resources/institutions/institutions";
import { track } from "@midday/events/client";
import { LogEvents } from "@midday/events/events";
import { Button } from "@midday/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import { Input } from "@midday/ui/input";
import { Skeleton } from "@midday/ui/skeleton";
import { useDebounce, useScript } from "@uidotdev/usehooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { BankLogo } from "../bank-logo";
import { ConnectBankProvider } from "../connect-bank-provider";
import { CountrySelector } from "../country-selector";
import { InstitutionInfo } from "../institution-info";

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[130px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[180px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[120px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[160px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[140px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[200px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[130px]" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3.5 w-[130px]" />
      </div>
    </div>
  );
}

type SearchResultProps = {
  id: string;
  name: string;
  logo: string | null;
  provider: string;
  countryCode: string;
  availableHistory: number;
  openPlaid: () => void;
};

function SearchResult({
  id,
  name,
  logo,
  provider,
  availableHistory,
  countryCode,
  openPlaid,
}: SearchResultProps) {
  return (
    <div className="flex justify-between">
      <div className="flex items-center">
        <BankLogo src={logo} alt={name} />

        <div className="ml-4 space-y-1 cursor-default">
          <p className="text-sm font-medium leading-none">{name}</p>
          <InstitutionInfo provider={provider}>
            <span className="text-[#878787] text-xs capitalize">
              Via {provider}
            </span>
          </InstitutionInfo>
        </div>
      </div>

      <ConnectBankProvider
        id={id}
        provider={provider}
        openPlaid={openPlaid}
        availableHistory={availableHistory}
        countryCode={countryCode}
      />
    </div>
  );
}

type SearchInstitutionsModalProps = {
  countryCode: string;
};

export function SearchInstitutionsModal({
  countryCode: initialCountryCode,
}: SearchInstitutionsModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Institutions["data"]>([]);
  const [plaidToken, setPlaidToken] = useState<string | undefined>();

  const {
    countryCode,
    q: query,
    step,
    setParams,
  } = useConnectParams(initialCountryCode);

  const isOpen = step === "connect";
  const debouncedSearchTerm = useDebounce(query, 100);

  // NOTE: Load SDKs here so it's not unmonted
  useScript("https://cdn.teller.io/connect/connect.js", {
    removeOnUnmount: false,
  });

  const { open: openPlaid } = usePlaidLink({
    token: plaidToken,
    publicKey: "",
    env: process.env.NEXT_PUBLIC_PLAID_ENVIRONMENT!,
    clientName: "Midday",
    product: ["transactions"],
    onSuccess: async (public_token, metadata) => {
      const accessToken = await exchangePublicToken(public_token);

      setParams({
        step: "account",
        provider: "plaid",
        token: accessToken,
        institution_id: metadata.institution?.institution_id,
      });
      track({
        event: LogEvents.ConnectBankAuthorized.name,
        channel: LogEvents.ConnectBankAuthorized.channel,
        provider: "plaid",
      });
    },
    onExit: () => {
      setParams({ step: "connect" });

      track({
        event: LogEvents.ConnectBankCanceled.name,
        channel: LogEvents.ConnectBankCanceled.channel,
        provider: "plaid",
      });
    },
  });

  const handleOnClose = () => {
    setParams({
      step: null,
      countryCode: null,
      q: null,
    });
  };

  async function fetchData(query?: string) {
    try {
      setLoading(true);
      const { data } = await getInstitutions({ countryCode, query });
      setLoading(false);

      setResults(data);
    } catch {
      setLoading(false);
      setResults([]);
    }
  }

  useEffect(() => {
    if (
      (isOpen && !results?.length > 0) ||
      countryCode !== initialCountryCode
    ) {
      fetchData();
    }
  }, [isOpen, countryCode]);

  useEffect(() => {
    if (isOpen) {
      fetchData(debouncedSearchTerm ?? undefined);
    }
  }, [debouncedSearchTerm, isOpen]);

  useEffect(() => {
    async function createLinkToken() {
      const token = await createPlaidLinkTokenAction();

      if (token) {
        setPlaidToken(token);
      }
    }

    if (isOpen) {
      createLinkToken();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOnClose}>
      <DialogContent>
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>Connect Bank</DialogTitle>

            <DialogDescription>
              Start by selecting your bank, once authenticated you can select
              which accounts you want to link to Midday.
            </DialogDescription>

            <div>
              <div className="flex space-x-2 my-3 relative">
                <Input
                  placeholder="Search bank..."
                  type="search"
                  onChange={(evt) => setParams({ q: evt.target.value })}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={query ?? ""}
                />

                <div className="absolute right-0">
                  <CountrySelector
                    defaultValue={countryCode}
                    onSelect={(countryCode) => setParams({ countryCode })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 h-[400px] overflow-auto scrollbar-hide">
                {loading && <SearchSkeleton />}

                {results?.map((institution) => {
                  if (!institution) {
                    return null;
                  }

                  return (
                    <SearchResult
                      key={institution.id}
                      id={institution.id}
                      name={institution.name}
                      logo={institution.logo}
                      provider={institution.provider}
                      countryCode={countryCode}
                      availableHistory={
                        institution.available_history
                          ? +institution.available_history
                          : 0
                      }
                      openPlaid={() => {
                        setParams({ step: null });
                        openPlaid();
                      }}
                    />
                  );
                })}

                {!loading && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[300px]">
                    <p className="font-medium mb-2">No banks found</p>
                    <p className="text-sm text-center text-[#878787]">
                      We could not find any banks matching your criteria. <br />
                      Please let us know which bank you are looking for.
                    </p>

                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        router.push("/account/support");
                      }}
                    >
                      Contact us
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
