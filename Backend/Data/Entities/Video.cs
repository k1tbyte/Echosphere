using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data.Entities;

public class Video
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }    
    [Column("owner_id")]
    public int OwnerId { get; set; }     
    [Column("title")]
    public string Title { get; set; }
    [Column("description")]
    public string Description { get; set; }   
    [Column("url")]
    public string Url { get; set; }    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }  
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }  
    [Column("is_public")]
    public bool IsPublic { get; set; }     
    public User Owner { get; set; }
}