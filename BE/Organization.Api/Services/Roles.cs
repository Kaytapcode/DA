namespace Organization.Api.Services
{
    public static class Roles
    {
        public const string SysAdmin = "SysAdmin";
        public const string OrgAdmin = "OrgAdmin";
        public const string Teacher  = "Teacher";
        public const string Student  = "Student";

        public static readonly string[] AllOrgRoles = [OrgAdmin, Teacher, Student];
        public static readonly string[] CanManageCourse = [SysAdmin, OrgAdmin, Teacher];
        public static readonly string[] CanManageMembers = [SysAdmin, OrgAdmin];
        public static readonly string[] CanPublishContent = [SysAdmin, OrgAdmin, Teacher];
        public static readonly string[] AnyAuthenticated = [SysAdmin, OrgAdmin, Teacher, Student];
    }
}
