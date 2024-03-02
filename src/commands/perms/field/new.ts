/* eslint-disable class-methods-use-this */
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import chalk from 'chalk';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import prompts, { PromptObject } from 'prompts';
import { PermissionSetUpdater } from '../../../PermissionSetUpdater.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-perms', 'perms.field.new');

export type PermsFieldNewResult = {
  isSuccess: boolean;
  errorMessage?: string;
};

export default class PermsFieldNew extends SfCommand<PermsFieldNewResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    directory: Flags.directory({
      summary: 'Default Directory',
      exists: true,
      default: './force-app/main/default',
      char: 'd',
    }),
  };

  public static fs = fsPromises;
  public static prompts = prompts;

  public async run(): Promise<PermsFieldNewResult> {
    const result: PermsFieldNewResult = {
      isSuccess: true,
    };

    const { flags } = await this.parse(PermsFieldNew);

    const directoryPath: string = path.resolve(flags.directory);

    try {
      await this.checkDirectory(directoryPath);
      const { permissionSetsSelected, objectSelected } = await this.selectPermissionSetsAndObject(directoryPath);
      const selectedFields = await this.selectFields(objectSelected, directoryPath);
      const fieldsPermissionSelected = await this.selectFieldsPermissions(selectedFields);
      const permissionSetUpdater = new PermissionSetUpdater(PermsFieldNew.fs);
      await Promise.all(
        permissionSetsSelected.map((permissionSet) =>
          permissionSetUpdater.updatePermissionSet(
            directoryPath,
            permissionSet,
            fieldsPermissionSelected,
            objectSelected
          )
        )
      );
      this.log(chalk.greenBright(`Permission Sets ${permissionSetsSelected.join(', ')} updated successfully!`));
    } catch (err) {
      result.isSuccess = false;
      result.errorMessage = (err as Error).message;
    }

    return result;
  }

  private async checkDirectory(directoryPath: string): Promise<void> {
    try {
      await PermsFieldNew.fs.access(directoryPath);
    } catch (err) {
      throw new Error(`Directory ${directoryPath} not found`);
    }
    const files = await PermsFieldNew.fs.readdir(directoryPath);
    if (files.length === 0) {
      throw new Error(`Directory ${directoryPath} is empty`);
    }
  }

  private async selectFields(objectSelected: string, directoryPath: string): Promise<string[]> {
    const pathToFields: string = path.resolve(directoryPath, 'objects', objectSelected, 'fields');
    await this.checkDirectory(pathToFields);
    const fields: string[] = await PermsFieldNew.fs.readdir(pathToFields);

    const fieldChoises: prompts.Choice[] = fields.map((file) => ({
      title: file.split('.')[0],
      value: file.split('.')[0],
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars
    const selectedFields = await PermsFieldNew.prompts({
      type: 'multiselect',
      name: 'Fields',
      message: 'Select Fields',
      choices: fieldChoises,
      min: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return selectedFields.Fields;
  }

  private async selectPermissionSetsAndObject(directoryPath: string): Promise<{
    permissionSetsSelected: string[];
    objectSelected: string;
  }> {
    const pathToPermissionSets: string = path.resolve(directoryPath, 'permissionsets');
    await this.checkDirectory(pathToPermissionSets);
    const pathToObjects: string = path.resolve(directoryPath, 'objects');
    await this.checkDirectory(pathToObjects);

    const [permissionsets, objects]: [string[], string[]] = await Promise.all([
      PermsFieldNew.fs.readdir(pathToPermissionSets),
      PermsFieldNew.fs.readdir(pathToObjects),
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
    const { permissionSetsSelected, objectSelected } = await PermsFieldNew.prompts([
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
    const fieldsPermissionSelected = await PermsFieldNew.prompts(fieldsPermissionPrompts);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fieldsPermissionSelected;
  }
}
