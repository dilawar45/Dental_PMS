import {
  createSupportToken,
  verifySupportToken,
  resolveSupportModeAccess,
  withVerifiedSupportClinic,
  AuthenticationError,
} from './support-mode';
import { getDefaultDb } from './index';
import { sql } from 'drizzle-orm';

async function runTests() {
  console.log('--- STARTING SUPPORT MODE TOKEN & AUTHENTICATION TESTS ---');

  const superAdmin = {
    id: '5d8b7cdc-05c7-40b7-9c12-8f88d2e3b6bd',
    role: 'super_admin',
  };

  const regularStaff = {
    id: 'a1111111-1111-1111-1111-111111111111',
    role: 'owner',
  };

  const targetClinicId = '11111111-1111-1111-1111-111111111111';
  const ownerId = '22222222-2222-2222-2222-222222222222';

  // 1. Generate a valid token
  const validToken = createSupportToken({
    superAdminId: superAdmin.id,
    targetClinicId,
    ownerId,
  });

  console.log('1. Generated valid token:', validToken.slice(0, 30) + '...');

  // 2. Verify valid token
  const validResult = verifySupportToken(validToken);
  if (!validResult.valid) {
    throw new Error(`Valid token check failed unexpectedly: ${validResult.reason}`);
  }
  console.log('✓ Valid token successfully verified with payload:', validResult.payload);

  // 3. Test tampering payload (modifying clinic ID in payload without resigning)
  const [payloadBase64, signature] = validToken.split('.');
  if (!payloadBase64 || !signature) {
    throw new Error('Malformed valid token');
  }
  const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
  const tamperedPayloadObj = JSON.parse(payloadJson);
  tamperedPayloadObj.targetClinicId = '33333333-3333-3333-3333-333333333333'; // Attempt unauthorized pivot
  const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString('base64url');
  const tamperedPayloadToken = `${tamperedPayloadBase64}.${signature}`;

  const tamperedPayloadResult = verifySupportToken(tamperedPayloadToken);
  if (tamperedPayloadResult.valid) {
    throw new Error('CRITICAL SECURITY FLAW: Tampered payload was accepted as valid!');
  }
  console.log('✓ Tampered payload rejected as expected:', tamperedPayloadResult.reason);

  // 4. Test tampering signature (client alters cookie characters)
  const tamperedSignatureToken = `${payloadBase64}.${signature.slice(0, -4)}abcd`;
  const tamperedSigResult = verifySupportToken(tamperedSignatureToken);
  if (tamperedSigResult.valid) {
    throw new Error('CRITICAL SECURITY FLAW: Tampered signature was accepted as valid!');
  }
  console.log('✓ Tampered signature rejected as expected:', tamperedSigResult.reason);

  // 5. Test expired token (-1 minute TTL)
  const expiredToken = createSupportToken(
    {
      superAdminId: superAdmin.id,
      targetClinicId,
      ownerId,
    },
    -1 // Expired 1 minute ago
  );
  const expiredResult = verifySupportToken(expiredToken);
  if (expiredResult.valid) {
    throw new Error('CRITICAL SECURITY FLAW: Expired token was accepted as valid!');
  }
  console.log('✓ Expired token rejected as expected:', expiredResult.reason);

  // 6. Test resolveSupportModeAccess & 401 AuthenticationError rejection
  console.log('\n--- Testing Request Boundary & 401 Authentication Rejections ---');

  // 6a. Tampered token throws 401
  try {
    resolveSupportModeAccess(tamperedPayloadToken, superAdmin);
    throw new Error('Expected 401 AuthenticationError was not thrown for tampered payload');
  } catch (err: any) {
    if (err instanceof AuthenticationError && err.status === 401) {
      console.log('✓ Tampered token properly rejected with 401 AuthenticationError:', err.message);
    } else {
      throw err;
    }
  }

  // 6b. Expired token throws 401
  try {
    resolveSupportModeAccess(expiredToken, superAdmin);
    throw new Error('Expected 401 AuthenticationError was not thrown for expired token');
  } catch (err: any) {
    if (err instanceof AuthenticationError && err.status === 401) {
      console.log('✓ Expired token properly rejected with 401 AuthenticationError:', err.message);
    } else {
      throw err;
    }
  }

  // 6c. Non-super-admin user attempting to use support token throws 401
  try {
    resolveSupportModeAccess(validToken, regularStaff);
    throw new Error('Expected 401 AuthenticationError was not thrown for non-super-admin caller');
  } catch (err: any) {
    if (err instanceof AuthenticationError && err.status === 401) {
      console.log('✓ Non-super-admin attempting support access rejected with 401:', err.message);
    } else {
      throw err;
    }
  }

  // 6d. Token signer mismatch throws 401
  try {
    resolveSupportModeAccess(validToken, { id: '77777777-7777-7777-7777-777777777777', role: 'super_admin' });
    throw new Error('Expected 401 AuthenticationError was not thrown for mismatched super-admin ID');
  } catch (err: any) {
    if (err instanceof AuthenticationError && err.status === 401) {
      console.log('✓ Token signer mismatch rejected with 401:', err.message);
    } else {
      throw err;
    }
  }

  // 7. Test DB Execution: withVerifiedSupportClinic setting DB session variables
  console.log('\n--- Testing DB Session Variables with Verified Token ---');
  const db = getDefaultDb();

  // 7a. Calling withVerifiedSupportClinic with tampered token is blocked before any DB transaction runs
  try {
    await withVerifiedSupportClinic(db, targetClinicId, tamperedPayloadToken, superAdmin, async () => {
      throw new Error('DB callback should NEVER be executed when token is tampered!');
    });
  } catch (err: any) {
    if (err instanceof AuthenticationError && err.status === 401) {
      console.log('✓ withVerifiedSupportClinic blocked tampered token with 401 before DB transaction');
    } else {
      throw err;
    }
  }

  // 7b. Calling withVerifiedSupportClinic with valid token verifies that DB session variables match exactly
  await withVerifiedSupportClinic(db, targetClinicId, validToken, superAdmin, async (tx) => {
    const clinicIdRes = await tx.execute(sql`SELECT current_setting('app.clinic_id', true) AS val;`);
    const supportModeRes = await tx.execute(sql`SELECT current_setting('app.support_mode', true) AS val;`);
    const realActorRes = await tx.execute(sql`SELECT current_setting('app.real_actor_id', true) AS val;`);
    const impersonatedUserRes = await tx.execute(sql`SELECT current_setting('app.impersonated_user_id', true) AS val;`);
    const actorIdRes = await tx.execute(sql`SELECT current_setting('app.actor_id', true) AS val;`);

    console.log('DB Session Variables in Support Mode:');
    console.log('  app.clinic_id:', clinicIdRes[0]?.val);
    console.log('  app.support_mode:', supportModeRes[0]?.val);
    console.log('  app.real_actor_id:', realActorRes[0]?.val);
    console.log('  app.impersonated_user_id:', impersonatedUserRes[0]?.val);
    console.log('  app.actor_id:', actorIdRes[0]?.val);

    if (clinicIdRes[0]?.val !== targetClinicId) throw new Error('app.clinic_id mismatch');
    if (supportModeRes[0]?.val !== 'true') throw new Error('app.support_mode mismatch');
    if (realActorRes[0]?.val !== superAdmin.id) throw new Error('app.real_actor_id mismatch');
    if (impersonatedUserRes[0]?.val !== ownerId) throw new Error('app.impersonated_user_id mismatch');
    if (actorIdRes[0]?.val !== superAdmin.id) throw new Error('app.actor_id mismatch');
  });

  console.log('✓ DB session variables confirmed correctly set inside transaction');

  console.log('\n======================================================');
  console.log('ALL SUPPORT MODE SECURITY & TAMPER TESTS PASSED 100%!');
  console.log('======================================================');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
