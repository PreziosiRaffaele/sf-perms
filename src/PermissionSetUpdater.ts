/* eslint-disable class-methods-use-this */
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface FieldPermission {
  editable: boolean;
  field: string;
  readable: boolean;
}

interface PermissionSet {
  PermissionSet: {
    [key: string]: unknown;
    fieldPermissions?: FieldPermission[];
  };
}

export class PermissionSetUpdater {
  private fs;

  public constructor(fs: typeof fsPromises) {
    this.fs = fs;
  }

  public async updatePermissionSet(
    directoryPath: string,
    permissionSet: string,
    fieldsPermissionSelected: { [key: string]: string },
    objectSelected: string
  ): Promise<void> {
    const completeFilePath: string = path.resolve(directoryPath, 'permissionsets', permissionSet);
    const permissionSetXml: string = await this.fs.readFile(completeFilePath, 'utf8');
    const indentation: string = this.getIndentation(permissionSetXml);
    const parser = new XMLParser({ ignoreAttributes: false });
    const permissionSetParsedJSON: PermissionSet = parser.parse(permissionSetXml) as PermissionSet;

    for (const field in fieldsPermissionSelected) {
      if (Object.prototype.hasOwnProperty.call(fieldsPermissionSelected, field)) {
        const completeFieldName = `${objectSelected}.${field}`;
        const fieldPermissionSelected = fieldsPermissionSelected[field as keyof typeof fieldsPermissionSelected];
        let fieldPermissions: FieldPermission[];
        if (permissionSetParsedJSON.PermissionSet.fieldPermissions) {
          fieldPermissions = permissionSetParsedJSON.PermissionSet.fieldPermissions;
        } else {
          fieldPermissions = [];
          permissionSetParsedJSON.PermissionSet.fieldPermissions = fieldPermissions;
          const permissionSetKeys = Object.keys(permissionSetParsedJSON.PermissionSet).sort();
          permissionSetParsedJSON.PermissionSet = permissionSetKeys.reduce<{
            [key: string]: unknown;
            fieldPermissions?: FieldPermission[] | undefined;
          }>((obj, v) => {
            obj[v] = permissionSetParsedJSON.PermissionSet[v];
            return obj;
          }, {});
        }

        const fieldPermission = fieldPermissions.find((fp) => fp.field === completeFieldName);

        if (fieldPermission) {
          fieldPermission.editable = fieldPermissionSelected === 'read_edit';
          fieldPermission.readable = fieldPermissionSelected !== 'none';
        } else {
          this.insertRespectingSorting(fieldPermissions, {
            editable: fieldPermissionSelected === 'read_edit',
            field: completeFieldName,
            readable: fieldPermissionSelected !== 'none',
          });
        }
      }
    }
    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, indentBy: indentation });
    const xmlContent: string = builder.build(permissionSetParsedJSON) as string;
    await this.fs.writeFile(completeFilePath, xmlContent);
  }

  private getIndentation(permissionSetXml: string): string {
    const match = permissionSetXml.match(/^( |\t)+/m);
    return match ? match[0] : '  '; // Default to two spaces if no indentation is found
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
