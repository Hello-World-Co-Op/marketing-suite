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
  RegisterEmailPasswordRequest,
  AuthResponse,
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

  // Auth types for registration (Story 2.1.2, BL-011.2)
  const AuthMethodType = IDL.Variant({
    EmailPassword: IDL.Null,
    InternetIdentity: IDL.Null,
    Google: IDL.Null,
    Apple: IDL.Null,
    Microsoft: IDL.Null,
    GitHub: IDL.Null,
    Discord: IDL.Null,
  });

  const RegisterEmailPasswordRequest = IDL.Record({
    email_encrypted: IDL.Text,
    first_name_encrypted: IDL.Text,
    last_name_encrypted: IDL.Text,
    email_hash: IDL.Text,
    password: IDL.Text,
    encryption_key_id: IDL.Text,
    encrypted_recovery_key: IDL.Text,
    password_salt: IDL.Text,
    email_plaintext_for_verification: IDL.Text,
    ip_hash: IDL.Opt(IDL.Text),
    // BL-011.2: DOB fields for COPPA compliance
    dob_encrypted: IDL.Text,
    dob_plaintext_for_validation: IDL.Text,
    // FOS-3.3.1: Optional CRM fields for lead tracking
    company: IDL.Opt(IDL.Text),
    job_title: IDL.Opt(IDL.Text),
    interest_area: IDL.Opt(IDL.Text),
    referral_source: IDL.Opt(IDL.Text),
  });

  const AuthResponse = IDL.Record({
    success: IDL.Bool,
    message: IDL.Text,
    access_token: IDL.Opt(IDL.Text),
    refresh_token: IDL.Opt(IDL.Text),
    session_id: IDL.Opt(IDL.Text),
    user_id: IDL.Opt(IDL.Text),
    preferred_auth_method: IDL.Opt(AuthMethodType),
    encrypted_recovery_key: IDL.Opt(IDL.Vec(IDL.Nat8)),
    password_salt: IDL.Opt(IDL.Vec(IDL.Nat8)),
    email_encrypted: IDL.Opt(IDL.Vec(IDL.Nat8)),
    first_name_encrypted: IDL.Opt(IDL.Vec(IDL.Nat8)),
    last_name_encrypted: IDL.Opt(IDL.Vec(IDL.Nat8)),
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
    register_email_password: IDL.Func(
      [RegisterEmailPasswordRequest],
      [IDL.Variant({ Ok: AuthResponse, Err: IDL.Text })],
      []
    ),
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

  /**
   * Register a new user account with email/password authentication (Story 2.1.2)
   * @param request - Registration data including encrypted PII and password
   * @returns Promise with authentication response or error
   */
  const registerEmailPassword = async (
    request: RegisterEmailPasswordRequest
  ): Promise<{ Ok: AuthResponse } | { Err: string }> => {
    if (!actor.register_email_password) {
      throw new Error('register_email_password method not available on canister');
    }
    return await actor.register_email_password(request);
  };

  return {
    submitIndividual,
    verifyCode,
    resendVerificationCode,
    getStats,
    registerEmailPassword,
  };
}
