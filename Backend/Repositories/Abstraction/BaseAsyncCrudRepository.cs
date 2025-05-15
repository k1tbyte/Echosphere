using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories.Abstraction;

public class BaseAsyncCrudRepository<T>(DbContext context, DbSet<T> set) : IAsyncCrudRepository<T> where T : class
{
    public async Task<T> Add(T entity)
    {
        var entry = await set.AddAsync(entity);
        await SaveAsync();
        return entry.Entity;
    }

    public async Task<T?> Get(int id)
    {
        return await set.FindAsync(id);
    }

    public async Task Update(T entity)
    {
        set.Update(entity);
        await SaveAsync();
    }

    public async Task<bool> DeleteById(long id)
    {
        var entity = await set.FindAsync(id);
        return await Delete(entity);
    }

    public async Task<bool> Delete(T? entity)
    {
        if (entity == null)
            return false;

        set.Remove(entity);
        await SaveAsync();
        return true;
    }
    public async Task SaveAsync()
    {
        await context.SaveChangesAsync().ConfigureAwait(false);
    }
}