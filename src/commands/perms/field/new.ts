/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as fs from 'node:fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import prompts, { PromptObject } from 'prompts';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-perms', 'perms.field.new');

export type PermsFieldNewResult = {
  isSucces: boolean;
  errorMessage?: string;
};

interface FieldPermission {
  editable: boolean;
  field: string;
  readable: boolean;
}

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
      this.updatePermissionSets(permissionSetsSelected, fieldsPermissionSelected, objectSelected);
      this.log('Permission Sets Updated');
    } catch (err) {
      result.isSucces = false;
      result.errorMessage = (err as Error).message;
    }

    return result;
  }

  private updatePermissionSets(
    permissionSetsSelected: string[],
    fieldsPermissionSelected: { [key: string]: string },
    objectSelected: string
  ): void {
    const optionsParser = { ignoreAttributes: false };
    const optionsBuilder = { ignoreAttributes: false, format: true };
    const parser = new XMLParser(optionsParser);
    const builder = new XMLBuilder(optionsBuilder);

    for (const permissionSet of permissionSetsSelected) {
      const permissionSetXml = fs.readFileSync(`./force-app/main/default/permissionsets/${permissionSet}`, 'utf8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const permissionSetParsedJSON = parser.parse(permissionSetXml);
      for (const field in fieldsPermissionSelected) {
        if (Object.prototype.hasOwnProperty.call(fieldsPermissionSelected, field)) {
          const completeFieldName = `${objectSelected}.${field}`;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const fieldPermissionSelected = fieldsPermissionSelected[field as keyof typeof fieldsPermissionSelected];
          if (permissionSetParsedJSON.PermissionSet.fieldPermissions) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const fieldPermissions: FieldPermission[] = permissionSetParsedJSON.PermissionSet.fieldPermissions;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const fieldPermission = fieldPermissions.find(
              // eslint-disable-next-line @typescript-eslint/no-shadow
              (fieldPermission: FieldPermission) => fieldPermission.field === completeFieldName
            );
            if (fieldPermission) {
              fieldPermission.editable = fieldPermissionSelected === 'read_edit';
              fieldPermission.readable = fieldPermissionSelected !== 'none';
            } else {
              this.insertRespectingSorting(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                fieldPermissions,
                {
                  editable: fieldPermissionSelected === 'read_edit',
                  field: completeFieldName,
                  readable: fieldPermissionSelected !== 'none',
                }
              );
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            permissionSetParsedJSON.PermissionSet.fieldPermissions = [
              {
                editable: fieldPermissionSelected === 'read_edit',
                field: completeFieldName,
                readable: fieldPermissionSelected !== 'none',
              },
            ];
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const xmlContent: string = builder.build(permissionSetParsedJSON);
          fs.writeFileSync(`./force-app/main/default/permissionsets/${permissionSet}`, xmlContent);
        }
      }
    }
  }

  private async selectFields(objectSelected: string): Promise<string[]> {
    const fields: string[] = fs.readdirSync(`./force-app/main/default/objects/${objectSelected}/fields`);

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
    const permissionsets = fs.readdirSync('./force-app/main/default/permissionsets');
    const objects = fs.readdirSync('./force-app/main/default/objects');

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

  private insertRespectingSorting(fieldPermissions: FieldPermission[], newFieldPermission: FieldPermission): void {
    let low = 0;
    let high = fieldPermissions.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (fieldPermissions[mid].field === newFieldPermission.field) {
        fieldPermissions.splice(mid, 0, newFieldPermission);
        return;
      } else if (fieldPermissions[mid].field < newFieldPermission.field) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    fieldPermissions.splice(low, 0, newFieldPermission);
  }
}
