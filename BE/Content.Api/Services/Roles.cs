namespace Content.Api.Services
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

    // Q3: the one course status vocabulary. PUBLISHED = Public (catalog-visible).
    public static class CourseStatus
    {
        public const string Draft = "DRAFT";
        public const string Published = "PUBLISHED";
        public const string Archived = "ARCHIVED";
        public static readonly string[] All = [Draft, Published, Archived];
    }
}
