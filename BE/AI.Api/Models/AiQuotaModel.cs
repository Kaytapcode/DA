using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AI.Api.Models
{
    [Table("ai_quota")]
    public class AiQuotaModel
    {
        [Key][Column("id")]
        public Guid Id { get; set; }

        [Required][Column("org_id")]
        public Guid OrgId { get; set; }

        [Column("calls_used")]
        public int CallsUsed { get; set; } = 0;

        [Column("calls_limit")]
        public int CallsLimit { get; set; } = 100;

        [Column("reset_date")]
        public DateTime ResetDate { get; set; } = DateTime.UtcNow.AddMonths(1);

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }
    }
}
