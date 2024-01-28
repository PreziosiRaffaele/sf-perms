/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { expect } from 'chai';
import PermsFieldNew, { PermsFieldNewResult } from '../../../../src/commands/perms/field/new.js';

const pathToPermissionSet = path.resolve('', 'test', 'force-app', 'main', 'default', 'permissionsets');

describe('perms field new', () => {
  const $$ = new TestContext();

  beforeEach(() => {
    fs.copyFileSync(
      path.resolve(pathToPermissionSet, 'FirstPermissionSet.permissionset-meta.xml'),
      path.resolve(pathToPermissionSet, 'FirstPermissionSetBackup.permissionset-meta.xml')
    );
  });

  afterEach(() => {
    $$.restore();
    fs.copyFileSync(
      path.resolve(pathToPermissionSet, 'FirstPermissionSetBackup.permissionset-meta.xml'),
      path.resolve(pathToPermissionSet, 'FirstPermissionSet.permissionset-meta.xml')
    );
    fs.unlinkSync(path.resolve(pathToPermissionSet, 'FirstPermissionSetBackup.permissionset-meta.xml'));
  });

  it('add new field permission', async () => {
    let callCount = 0;
    $$.SANDBOX.stub(PermsFieldNew, 'prompts').callsFake(() => {
      callCount++;
      switch (callCount) {
        case 1:
          return Promise.resolve({
            permissionSetsSelected: ['FirstPermissionSet.permissionset-meta.xml'],
            objectSelected: 'Account',
          });
        case 2:
          return Promise.resolve({
            Fields: ['Address__c', 'AddressString__c'],
          });
        case 3:
          return Promise.resolve({
            // eslint-disable-next-line camelcase
            Address__c: 'read',
            // eslint-disable-next-line camelcase
            AddressString__c: 'read_edit',
          });
        default:
          return Promise.resolve({});
      }
    });
    const result: PermsFieldNewResult = await PermsFieldNew.run(['--directory', 'test/force-app/main/default']);
    expect(result).to.have.property('isSuccess', true);
    // check field permissions are added in the file
    const permissionSetXml = fs.readFileSync(
      path.resolve(pathToPermissionSet, 'FirstPermissionSet.permissionset-meta.xml'),
      'utf8'
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const permissionSetParsedJSON = new XMLParser({ ignoreAttributes: false }).parse(permissionSetXml);
    expect(permissionSetParsedJSON).to.have.property('PermissionSet');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(permissionSetParsedJSON.PermissionSet).to.have.property('fieldPermissions');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(permissionSetParsedJSON.PermissionSet.fieldPermissions).to.be.an('array');
    expect(permissionSetParsedJSON.PermissionSet.fieldPermissions).to.have.lengthOf(2);
    expect(
      permissionSetParsedJSON.PermissionSet.fieldPermissions.find(
        (fp: { field: string }) => fp.field === 'Account.Address__c'
      )
    ).to.have.property('editable', false);
    expect(
      permissionSetParsedJSON.PermissionSet.fieldPermissions.find(
        (fp: { field: string }) => fp.field === 'Account.Address__c'
      )
    ).to.have.property('readable', true);
    expect(
      permissionSetParsedJSON.PermissionSet.fieldPermissions.find(
        (fp: { field: string }) => fp.field === 'Account.AddressString__c'
      )
    ).to.have.property('editable', true);
    expect(
      permissionSetParsedJSON.PermissionSet.fieldPermissions.find(
        (fp: { field: string }) => fp.field === 'Account.AddressString__c'
      )
    ).to.have.property('readable', true);
  });
});
