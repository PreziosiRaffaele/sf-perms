/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { promises as fsPromises } from 'node:fs';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import prompts, { PromptObject } from 'prompts';
import { PermissionSetUpdater } from '../../../PermissionSetUpdater.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-perms', 'perms.field.new');

export type PermsFieldNewResult = {
  isSucces: boolean;
  errorMessage?: string;
};

export default class PermsFieldNew extends SfCommand<PermsFieldNewResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {};

  // eslint-disable-next-line class-methods-use-this
  public async run(): Promise<PermsFieldNewResult> {
    const result: PermsFieldNewResult = {
      isSucces: true,
    };

    try {
      const { permissionSetsSelected, objectSelected } = await this.selectPermissionSetsAndObject();
      const selectedFields = await this.selectFields(objectSelected);
      const fieldsPermissionSelected = await this.selectFieldsPermissions(selectedFields);
      const permissionSetUpdater = new PermissionSetUpdater(fsPromises);
      await Promise.all(
        permissionSetsSelected.map((permissionSet) =>
          permissionSetUpdater.updatePermissionSet(permissionSet, fieldsPermissionSelected, objectSelected)
        )
      );
      this.log(`Permission Sets ${permissionSetsSelected.join(', ')} updated successfully!`);
    } catch (err) {
      result.isSucces = false;
      result.errorMessage = (err as Error).message;
    }

    return result;
  }

  private async selectFields(objectSelected: string): Promise<string[]> {
    const fields: string[] = await fsPromises.readdir(`./force-app/main/default/objects/${objectSelected}/fields`);

    const fieldChoises: prompts.Choice[] = fields.map((file) => ({
      title: file.split('.')[0],
      value: file.split('.')[0],
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars
    const selectedFields = await prompts({
      type: 'multiselect',
      name: 'Fields',
      message: 'Select Fields',
      choices: fieldChoises,
      min: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return selectedFields.Fields;
  }

  private async selectPermissionSetsAndObject(): Promise<{
    permissionSetsSelected: string[];
    objectSelected: string;
  }> {
    const [permissionsets, objects]: [string[], string[]] = await Promise.all([
      fsPromises.readdir('./force-app/main/default/permissionsets'),
      fsPromises.readdir('./force-app/main/default/objects'),
    ]);

    const permissionSetChoises: prompts.Choice[] = permissionsets.map((file) => ({
      title: file.split('.')[0],
      value: file,
    }));

    const objectChoises: prompts.Choice[] = objects.map((file) => ({
      title: file.split('.')[0],
      value: file,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars
    const { permissionSetsSelected, objectSelected } = await prompts([
      {
        type: 'multiselect',
        name: 'permissionSetsSelected',
        message: 'Select Permission Sets',
        choices: permissionSetChoises,
        min: 1,
      },
      {
        type: 'select',
        name: 'objectSelected',
        message: 'Select Objects',
        choices: objectChoises,
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { permissionSetsSelected, objectSelected };
  }

  private async selectFieldsPermissions(selectedFields: string[]): Promise<{ [key: string]: string }> {
    const fieldPermissionChoises: prompts.Choice[] = [
      {
        title: 'Read',
        value: 'read',
      },
      {
        title: 'Read/Edit',
        value: 'read_edit',
      },
      {
        title: 'None',
        value: 'none',
      },
    ];

    const fieldsPermissionPrompts: Array<PromptObject<string>> = selectedFields.map((field: string) => ({
      type: 'select',
      name: field,
      message: `Select Access for ${field}`,
      choices: fieldPermissionChoises,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const fieldsPermissionSelected = await prompts(fieldsPermissionPrompts);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fieldsPermissionSelected;
  }
}
