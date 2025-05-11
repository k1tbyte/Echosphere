namespace Backend.Repositories.Abstraction;

public interface IAsyncCrudRepository<T>
{
    public Task<T> Add(T entity);

    public Task<T?> Get(long id);

    public Task Update(T entity);

    public Task<bool> DeleteById(long id);
    public Task<bool> Delete(T entity);
    public Task SaveAsync();
}