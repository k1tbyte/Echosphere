using Backend.Data;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class VideoRepository(AppDbContext context):IVideoRepository
{
    public bool Autosave { get; set; } = true;
    public async Task<Video> Add(Video entity)
    {
        var entry = await context.Videos.AddAsync(entity);
        await SaveAsync();
        return entry.Entity;
    }

    public async Task<Video?> Get(int id)
    {
        return await context.Videos.FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task Update(Video entity)
    {
        context.Videos.Update(entity);
        await SaveAsync();
    }

    public async Task<bool> DeleteById(long id)
    {
        var entity = await context.Videos.FindAsync(id);
        return await Delete(entity);
    }

    public async Task<bool> Delete(Video entity)
    {
        if (entity == null)
            return false;

        context.Videos.Remove(entity);
        await SaveAsync();
        return true;
    }

    public async Task SaveAsync()
    {
        if (!Autosave)
            return;
        
        await context.SaveChangesAsync().ConfigureAwait(false);
    }
}