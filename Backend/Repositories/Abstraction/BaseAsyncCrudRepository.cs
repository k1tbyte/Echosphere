using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories.Abstraction;

public class BaseAsyncCrudRepository<T, TDerived>(DbContext context, DbSet<T> set) : IAsyncCrudRepository<T, TDerived> 
    where T : class
    where TDerived : IAsyncCrudRepository<T, TDerived>
{
    int AutoSaveRequests { get; set; }
    public DbSet<T> Set => context.Set<T>();
    public TDerived WithAutoSave(int nextRequestsCount = 1)
    {
        AutoSaveRequests = nextRequestsCount;
        return (TDerived)(object)this;
    }

    public async Task<T> Add(T entity)
    {
        var entry = await set.AddAsync(entity);
        await _saveInternalAsync();
        return entry.Entity;
    }

    public async Task<T?> Get(int id)
    {
        return await set.FindAsync(id);
    }

    public async Task<T> Update(T entity)
    {
        var entry = set.Update(entity);
        await _saveInternalAsync();
        return entry.Entity;
    }

    public async Task<bool> DeleteById(object id)
    {
        var entity = await set.FindAsync(id);
        return await Delete(entity);
    }

    public async Task<bool> Delete(T? entity)
    {
        if (entity == null)
            return false;

        set.Remove(entity);
        await _saveInternalAsync();
        return true;
    }
    public async Task<TDerived> SaveAsync()
    {
        await context.SaveChangesAsync().ConfigureAwait(false);
        return (TDerived)(object)this;
    }

    private async Task _saveInternalAsync()
    {
        if (AutoSaveRequests == -1)
        {
            await SaveAsync();
            return;
        }
        if (AutoSaveRequests > 0)
        {
            AutoSaveRequests--;
            await SaveAsync();
        }
    }
}