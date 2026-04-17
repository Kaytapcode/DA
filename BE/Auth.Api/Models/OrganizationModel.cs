using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auth.Api.Models
{
    [Table("organizations")]
    public class OrganizationModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column("address")]
        [StringLength(500)]
        public string? Address { get; set; }

        [Column("slug")]
        [StringLength(50)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [Column("owner_id")]
        public Guid OwnerId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Foreign key to User
        [ForeignKey(nameof(OwnerId))]
        public UserModel? Owner { get; set; }

        // Navigation properties
        public ICollection<MemberModel> Members { get; set; } = new List<MemberModel>();
        public ICollection<CourseModel> Courses { get; set; } = new List<CourseModel>();
    }
}
