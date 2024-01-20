/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as fs from 'node:fs/promises';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import prompts from 'prompts';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-perms', 'perms.field.new');

export type PermsFieldNewResult = {
  isSucces: boolean;
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
    const [permissionsets, objects] = await Promise.all([
      fs.readdir('./force-app/main/default/permissionsets'),
      fs.readdir('./force-app/main/default/objects'),
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const fields: string[] = await fs.readdir(`./force-app/main/default/objects/${objectSelected}/fields`);

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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const fieldsPermissionPrompts: Array<prompts.PromptObject<'Fields'>> = selectedFields.Fields.map(
      (field: string) => ({
        type: 'select',
        name: field,
        message: `Select Access for ${field}`,
        choices: fieldPermissionChoises,
      })
    );

    const optionsParser = { ignoreAttributes: false };
    const optionsBuilder = { ignoreAttributes: false, format: true };
    const parser = new XMLParser(optionsParser);
    const builder = new XMLBuilder(optionsBuilder);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const fieldsPermissionSelected = await prompts(fieldsPermissionPrompts);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    permissionSetsSelected.forEach(async (permissionSet: string) => {
      const permissionSetXml = await fs.readFile(`./force-app/main/default/permissionsets/${permissionSet}`, 'utf8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const permissionSetParsedJSON = parser.parse(permissionSetXml);
      for (const field in fieldsPermissionSelected) {
        if (Object.prototype.hasOwnProperty.call(fieldsPermissionSelected, field)) {
          const completeFieldName = `${objectSelected}.${field}`;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const fieldPermissionSelected = fieldsPermissionSelected[field as keyof typeof fieldsPermissionSelected];
          if (permissionSetParsedJSON.PermissionSet.fieldPermissions) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const fieldPermission = permissionSetParsedJSON.PermissionSet.fieldPermissions.find(
              // eslint-disable-next-line @typescript-eslint/no-shadow
              (fieldPermission: FieldPermission) => fieldPermission.field === completeFieldName
            );
            if (fieldPermission) {
              fieldPermission.editable = fieldPermissionSelected === 'read_edit';
              fieldPermission.readable = fieldPermissionSelected !== 'none';
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              permissionSetParsedJSON.PermissionSet.fieldPermissions.push({
                editable: fieldPermissionSelected === 'read_edit',
                field: completeFieldName,
                readable: fieldPermissionSelected !== 'none',
              });
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
          // eslint-disable-next-line @typescript-eslint/no-floating-promises, no-await-in-loop
          await fs.writeFile(`./force-app/main/default/permissionsets/${permissionSet}`, xmlContent);
        }
      }
    });
    return {
      isSucces: true,
    };
  }
}
