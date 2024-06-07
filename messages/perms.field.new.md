# summary

Add field permissions to permission sets.

# description

The sf perms field new command facilitates the addition of field permissions to permission sets. It guides the user through the process of configuring these permissions.

To specify the directories containing the permissionsets and objects folders, use the --directory-permission-set and --directory-object flags, respectively. If both folders are located within the same directory, you can simplify the command by using the --directory flag to specify the common directory.

If no directory is specified, the default directory ./force-app/main/default will be used.

# flags.directory.summary

The directory that contains the permissionsets/objects folder.

# flags[directory-permission-set].summary

The directory that contains the permissionsets folder.

# flags[directory-object].summary

The directory that contains the objects folder.

# examples

sf perms field new
