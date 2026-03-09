import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const conciergeStorePath = path.resolve(__dirname, '../lib/concierge-store.tsx');
const conciergeStoreSource = fs.readFileSync(conciergeStorePath, 'utf-8');

const routersPath = path.resolve(__dirname, '../server/routers.ts');
const routersSource = fs.readFileSync(routersPath, 'utf-8');

const dbPath = path.resolve(__dirname, '../server/db.ts');
const dbSource = fs.readFileSync(dbPath, 'utf-8');

describe('Concierge cloud sync: store wiring', () => {
  it('imports trpc client', () => {
    expect(conciergeStoreSource).toContain("import { trpc } from './trpc'");
  });

  it('uses createRequestMutation for cloud sync', () => {
    expect(conciergeStoreSource).toContain('trpc.concierge.createRequest.useMutation()');
    expect(conciergeStoreSource).toContain('createRequestMutation.mutateAsync');
  });

  it('uses addMessageMutation for cloud sync', () => {
    expect(conciergeStoreSource).toContain('trpc.concierge.addMessage.useMutation()');
    expect(conciergeStoreSource).toContain('addMessageMutation.mutateAsync');
  });

  it('createRequest syncs to cloud when authenticated', () => {
    const createSection = conciergeStoreSource.slice(
      conciergeStoreSource.indexOf('const createRequest = useCallback'),
      conciergeStoreSource.indexOf('const addMessage = useCallback')
    );
    expect(createSection).toContain('isAuthenticated');
    expect(createSection).toContain('createRequestMutation.mutateAsync');
    expect(createSection).toContain('addMessageMutation.mutateAsync');
  });

  it('addMessage syncs to cloud when authenticated', () => {
    const addMsgSection = conciergeStoreSource.slice(
      conciergeStoreSource.indexOf('const addMessage = useCallback'),
      conciergeStoreSource.indexOf('const getMessages = useCallback')
    );
    expect(addMsgSection).toContain('isAuthenticated');
    expect(addMsgSection).toContain('addMessageMutation.mutateAsync');
  });

  it('has restoreFromCloud function that fetches requests and messages', () => {
    expect(conciergeStoreSource).toContain('async function restoreFromCloud');
    expect(conciergeStoreSource).toContain('listRequestsQuery.refetch');
    expect(conciergeStoreSource).toContain('MERGE_CLOUD_DATA');
  });

  it('triggers restoreFromCloud when authenticated and no local requests', () => {
    expect(conciergeStoreSource).toContain('isAuthenticated && state.initialized && state.requests.length === 0');
    expect(conciergeStoreSource).toContain('restoreFromCloud()');
  });

  it('has MERGE_CLOUD_DATA action in reducer', () => {
    expect(conciergeStoreSource).toContain("case 'MERGE_CLOUD_DATA':");
  });
});

describe('Concierge cloud sync: server endpoints', () => {
  it('has concierge.createRequest endpoint', () => {
    expect(routersSource).toContain('createRequest: protectedProcedure');
    expect(routersSource).toContain('db.createRequest');
  });

  it('has concierge.addMessage endpoint', () => {
    expect(routersSource).toContain('addMessage: protectedProcedure');
    expect(routersSource).toContain('db.addMessage');
  });

  it('has concierge.listRequests endpoint', () => {
    expect(routersSource).toContain('listRequests: protectedProcedure');
    expect(routersSource).toContain('db.getUserRequests');
  });

  it('has concierge.getMessages endpoint', () => {
    expect(routersSource).toContain('getMessages: protectedProcedure');
    expect(routersSource).toContain('db.getRequestMessages');
  });
});

describe('Concierge cloud sync: DB functions', () => {
  it('has createRequest DB function', () => {
    expect(dbSource).toContain('export async function createRequest');
  });

  it('has addMessage DB function', () => {
    expect(dbSource).toContain('export async function addMessage');
  });

  it('has getUserRequests DB function', () => {
    expect(dbSource).toContain('export async function getUserRequests');
  });

  it('has getRequestMessages DB function', () => {
    expect(dbSource).toContain('export async function getRequestMessages');
  });
});
