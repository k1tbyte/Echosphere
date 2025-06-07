using Backend.Data.Entities;
using Backend.DTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Backend.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration)
    : DbContext(options)
{
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<RefreshSession> Sessions { get; set; } = null!;
    public DbSet<Friendship> Friendships { get; set; } = null!;
    public DbSet<UserSimplifiedDTO> UserSimplified { get; set; }= null!;
    public DbSet<Video> Videos { get; set; } = null!;
    public DbSet<Playlist> Playlists { get; set; } = null!;
    public DbSet<PlaylistVideo> PlaylistVideos { get; set; } = null!;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseCollation("en_US.UTF-8");
        // Key generation strategy based on the database provider
        modelBuilder.Entity<User>()
            .Property(u => u.Id)
            .UseIdentityAlwaysColumn() 
            .ValueGeneratedOnAdd()
            .Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Ignore);
        modelBuilder.Entity<Playlist>()
            .Property(p => p.Id)
            .UseIdentityAlwaysColumn() 
            .ValueGeneratedOnAdd()
            .Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Ignore);
        
        modelBuilder.Entity<RefreshSession>()
            .HasOne<User>()
            .WithMany()     
            .HasForeignKey(rs => rs.UserId)
            .OnDelete(DeleteBehavior.Cascade); 
        
        modelBuilder.UseIdentityColumns();
        modelBuilder.Entity<Friendship>()
            .HasKey(f => new { f.RequesterId, f.AddresseeId });

        modelBuilder.Entity<Friendship>()
            .HasOne(f => f.Requester)
            .WithMany(u => u.SentFriendRequests)
            .HasForeignKey(f => f.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Friendship>()
            .HasOne(f => f.Addressee)
            .WithMany(u => u.ReceivedFriendRequests)
            .HasForeignKey(f => f.AddresseeId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Video>()
            .HasOne(v => v.Owner)  
            .WithMany(u => u.Videos)           
            .HasForeignKey(v => v.OwnerId);
        modelBuilder.Entity<UserSimplifiedDTO>().HasNoKey().ToView(null);
        
        modelBuilder.Entity<PlaylistVideo>(entity =>
        {
            entity.HasKey(pv => new { pv.PlaylistId, pv.VideoId });
            entity.HasOne(pv => pv.Playlist)
                .WithMany(p => p.PlaylistVideos)
                .HasForeignKey(pv => pv.PlaylistId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(pv => pv.Video)
                .WithMany()
                .HasForeignKey(pv => pv.VideoId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        
        base.OnModelCreating(modelBuilder);
    }
    
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("Database"));
    }
}