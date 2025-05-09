using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration)
    : DbContext(options)
{
    public DbSet<User> Users { get; set; } = null!;
 
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Key generation strategy based on the database provider
        modelBuilder.UseIdentityColumns();
        
        base.OnModelCreating(modelBuilder);
    }
    
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("Database"));
    }
}