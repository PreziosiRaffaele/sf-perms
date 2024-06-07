# sf-perms

The sf perms field new command facilitates the addition of field permissions to permission sets. It guides the user through the process of configuring these permissions.

To specify the directories containing the permissionsets and objects folders, use the --directory-permission-set and --directory-object flags, respectively. If both folders are located within the same directory, you can simplify the command by using the --directory flag to specify the common directory.

If no directory is specified, the default directory ./force-app/main/default will be used.

## Install

```bash
sf plugins install sf-perms
```

## Commands

<!-- commands -->

- [`sf perms field new`](#sf-perms-field-new)

## `sf perms field new`

```
USAGE
  $ sf perms field new [--json] [-d <value>] [-p <value>] [-f <value>]

FLAGS
  -d, --directory=<value>                 The directory that contains the permissionsets/objects folder.
  -f, --directory-object=<value>          The directory that contains the objects folder.
  -p, --directory-permission-set=<value>  The directory that contains the permissionsets folder.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Add field permissions to permission sets.

  The sf perms field new command facilitates the addition of field permissions to permission sets. It guides the user through the process of configuring these permissions.

  To specify the directories containing the permissionsets and objects folders, use the --directory-permission-set and --directory-object flags, respectively. If both folders are located within the
  same directory, you can simplify the command by using the --directory flag to specify the common directory.

  If no directory is specified, the default directory ./force-app/main/default will be used.

EXAMPLES
  $ sf perms field new
```
