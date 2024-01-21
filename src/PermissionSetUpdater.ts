/* eslint-disable class-methods-use-this */
import { promises as fsPromises } from 'node:fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface FieldPermission {
  editable: boolean;
  field: string;
  readable: boolean;
}

interface PermissionSet {
  PermissionSet: {
    fieldPermissions?: FieldPermission[];
  };
}

export class PermissionSetUpdater {
  private parserOptions = { ignoreAttributes: false };
  private builderOptions = { ignoreAttributes: false, format: true };

  private parser = new XMLParser(this.parserOptions);
  private builder = new XMLBuilder(this.builderOptions);
  private fs;

  public constructor(fs: typeof fsPromises) {
    this.fs = fs;
  }

  public async updatePermissionSet(
    permissionSet: string,
    fieldsPermissionSelected: { [key: string]: string },
    objectSelected: string
  ): Promise<void> {
    const completeFilePath = `./force-app/main/default/permissionsets/${permissionSet}`;
    const permissionSetXml = await this.fs.readFile(completeFilePath, 'utf8');
    const permissionSetParsedJSON = this.parser.parse(permissionSetXml) as PermissionSet;

    for (const field in fieldsPermissionSelected) {
      if (Object.prototype.hasOwnProperty.call(fieldsPermissionSelected, field)) {
        const completeFieldName = `${objectSelected}.${field}`;
        const fieldPermissionSelected = fieldsPermissionSelected[field as keyof typeof fieldsPermissionSelected];

        const fieldPermissions: FieldPermission[] = permissionSetParsedJSON.PermissionSet.fieldPermissions ?? [];
        permissionSetParsedJSON.PermissionSet.fieldPermissions = fieldPermissions;
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

    const xmlContent: string = this.builder.build(permissionSetParsedJSON) as string;
    await this.fs.writeFile(completeFilePath, xmlContent);
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
