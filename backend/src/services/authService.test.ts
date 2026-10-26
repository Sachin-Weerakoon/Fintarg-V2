import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '../models/User';
import { ProfileModel } from '../models/Profile';
import { BankAccountModel } from '../models/BankAccount';
import { PersonalBudgetModel } from '../models/PersonalBudget';
import { registerUser } from './authService';
import { verifyPassword } from '../utils/password';

describe('Auth Service Registration Database Pipeline', () => {
  let mongoServer: MongoMemoryServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ProfileModel.deleteMany({});
    await BankAccountModel.deleteMany({});
    await PersonalBudgetModel.deleteMany({});
  });

  it('initializes all database layers correctly upon signup (salary -> basic plan)', async () => {
    const input = {
      name: 'Sachin Weerakoon',
      email: 'Sachin@Example.COM',
      password: 'SecurePassword123!',
      workMode: 'salary' as const,
    };

    const result = await registerUser(input);

    assert.ok(result.user._id, 'User should be created with an ID');
    assert.strictEqual(result.user.email, 'sachin@example.com');
    assert.strictEqual(result.user.plan, 'basic');
    assert.strictEqual(result.user.workMode, 'salary');
    assert.strictEqual(result.user.tokenVersion, 0);

    // Password must be hashed with salt, not plain text
    assert.notStrictEqual(result.user.passwordHash, input.password);
    const valid = await verifyPassword(input.password, result.user.salt, result.user.passwordHash);
    assert.strictEqual(valid, true, 'Stored password hash must verify with the salt');

    // Layer 2: Profile
    assert.ok(result.profile._id, 'Profile document should exist');
    assert.strictEqual(result.profile.userId.toString(), result.user._id.toString());
    assert.strictEqual(result.profile.name, 'Sachin Weerakoon');
    assert.strictEqual(result.profile.email, 'sachin@example.com');
    assert.strictEqual(result.profile.darkMode, true);
    assert.strictEqual(result.profile.textSize, 'medium');
    assert.strictEqual(result.profile.themeColor, '#0FA3B1');

    // Layer 3: Built-in default Cash Wallet
    assert.ok(result.cashWallet, 'Cash wallet must be initialized');
    assert.strictEqual(result.cashWallet.userId.toString(), result.user._id.toString());
    assert.strictEqual(result.cashWallet.accountType, 'cash');
    assert.strictEqual(result.cashWallet.accountName, 'Cash Wallet');
    assert.strictEqual(result.cashWallet.bankName, 'Cash');
    assert.strictEqual(result.cashWallet.accountNumber, 'CASH');
    assert.strictEqual(result.cashWallet.isDefault, true);
    assert.strictEqual(result.cashWallet.balanceCents, 0);

    // Layer 4: Initial Personal Budget
    assert.ok(result.personalBudget, 'Personal budget document must exist');
    assert.strictEqual(result.personalBudget.userId.toString(), result.user._id.toString());
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    assert.strictEqual(result.personalBudget.month, expectedMonth);
    assert.strictEqual(result.personalBudget.budgetCents, 0);

    // Verify persisted counts in DB
    assert.strictEqual(await UserModel.countDocuments(), 1);
    assert.strictEqual(await ProfileModel.countDocuments(), 1);
    assert.strictEqual(await BankAccountModel.countDocuments(), 1);
    assert.strictEqual(await PersonalBudgetModel.countDocuments(), 1);
  });

  it('maps business and both workModes to business plan', async () => {
    const res1 = await registerUser({
      name: 'Biz User',
      email: 'biz@example.com',
      password: 'Password123!',
      workMode: 'business',
    });
    assert.strictEqual(res1.user.plan, 'business');

    const res2 = await registerUser({
      name: 'Both User',
      email: 'both@example.com',
      password: 'Password123!',
      workMode: 'both',
    });
    assert.strictEqual(res2.user.plan, 'business');
  });

  it('rejects registration with duplicate email (409 Conflict)', async () => {
    await registerUser({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'Password123!',
      workMode: 'salary',
    });

    await assert.rejects(
      async () => {
        await registerUser({
          name: 'Second User',
          email: 'DUPLICATE@example.com',
          password: 'Password456!',
          workMode: 'salary',
        });
      },
      (err: any) => err.status === 409 && /already registered/i.test(err.message),
    );
  });
});
