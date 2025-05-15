using Backend.Data.Entities;
using Backend.DTO;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration)
    : DbContext(options)
{
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<RefreshSession> Sessions { get; set; } = null!;
    public DbSet<Friendship> Friendships { get; set; } = null!;
    public DbSet<UserSimplifiedDTO> UserSimplified { get; set; }= null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Key generation strategy based on the database provider
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
        modelBuilder.Entity<UserSimplifiedDTO>().HasNoKey().ToView(null);
        
        base.OnModelCreating(modelBuilder);
    }
    
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("Database"));
    }
}