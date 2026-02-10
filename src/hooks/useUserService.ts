import { useMemo } from 'react';
import { HttpAgent, Actor, type ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import type {
  UserServiceActor,
  IndividualRequest,
  AddressRequest,
  IndividualResult,
  VerifyResult,
  Stats,
} from '../types/user-service';

// Candid interface definition for user-service (marketing-suite subset)
const idlFactory = (({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const AddressType = IDL.Variant({
    Home: IDL.Null,
    Work: IDL.Null,
    Billing: IDL.Null,
    Shipping: IDL.Null,
    Other: IDL.Text,
  });

  const AddressRequest = IDL.Record({
    address_type: AddressType,
    country: IDL.Text,
    state: IDL.Opt(IDL.Text),
    city: IDL.Text,
    postal_code: IDL.Text,
    street_address: IDL.Opt(IDL.Text),
    street_address2: IDL.Opt(IDL.Text),
    is_primary: IDL.Bool,
  });

  const EncryptionType = IDL.Variant({
    UserDerived: IDL.Null,
    Temporary: IDL.Null,
  });

  const IndividualRequest = IDL.Record({
    email_encrypted: IDL.Text,
    first_name_encrypted: IDL.Text,
    last_name_encrypted: IDL.Text,
    email_hash: IDL.Text,
    encryption_key_id: IDL.Text,
    encryption_type: EncryptionType,
    email_plaintext_for_verification: IDL.Text,
  });

  const IndividualResult = IDL.Record({
    success: IDL.Bool,
    message: IDL.Text,
    id: IDL.Opt(IDL.Text),
  });

  const VerifyResult = IDL.Record({
    success: IDL.Bool,
    message: IDL.Text,
  });

  const Stats = IDL.Record({
    total_individuals: IDL.Nat64,
    verified_individuals: IDL.Nat64,
    pending_verifications: IDL.Nat64,
  });

  return IDL.Service({
    submit_individual: IDL.Func(
      [IndividualRequest, IDL.Opt(AddressRequest)],
      [IndividualResult],
      []
    ),
    verify_email: IDL.Func([IDL.Text], [VerifyResult], []),
    verify_code: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text], [VerifyResult], []),
    resend_verification_code: IDL.Func([IDL.Text], [VerifyResult], []),
    get_stats: IDL.Func([], [Stats], ['query']),
  });
}) as unknown as IDL.InterfaceFactory;

// Canister ID - set via environment variable
const CANISTER_ID = import.meta.env.VITE_USER_SERVICE_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';

// Host configuration based on environment
const getHost = () => {
  const network = import.meta.env.VITE_NETWORK || 'local';
  if (network === 'ic') {
    return 'https://ic0.app';
  }
  return 'http://127.0.0.1:4943';
};

/**
 * Custom hook for interacting with the user-service canister
 * Marketing-suite subset: waitlist signup, email verification, stats
 */
export function useUserService() {
  const actor = useMemo(() => {
    const agent = HttpAgent.createSync({
      host: getHost(),
    });

    const network = import.meta.env.VITE_NETWORK || 'local';
    if (network === 'local') {
      agent.fetchRootKey().catch((err) => {
        console.warn('Unable to fetch root key. Check your local replica is running.');
        console.error(err);
      });
    }

    return Actor.createActor(idlFactory, {
      agent,
      canisterId: CANISTER_ID,
    }) as ActorSubclass<UserServiceActor>;
  }, []);

  const submitIndividual = async (
    request: IndividualRequest,
    address?: AddressRequest
  ): Promise<IndividualResult> => {
    const addressOpt: [AddressRequest] | [] = address ? [address] : [];
    return await actor.submit_individual(request, addressOpt);
  };

  const verifyCode = async (
    email: string,
    code: string,
    firstName: string = '',
    lastName: string = ''
  ): Promise<VerifyResult> => {
    if (!actor.verify_code) {
      throw new Error('verify_code method not available on canister');
    }
    return await actor.verify_code(email, code, firstName, lastName);
  };

  const resendVerificationCode = async (email: string): Promise<VerifyResult> => {
    if (!actor.resend_verification_code) {
      throw new Error('resend_verification_code method not available on canister');
    }
    return await actor.resend_verification_code(email);
  };

  const getStats = async (): Promise<Stats> => {
    return await actor.get_stats();
  };

  return {
    submitIndividual,
    verifyCode,
    resendVerificationCode,
    getStats,
  };
}
