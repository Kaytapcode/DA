using Identity.Api.Data;
using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace Identity.Api.IntegrationTests;

public sealed class UserRepositoryIntegrationTests
{
    [Fact]
    public async Task RepositoryCrud_Works_WithPostgreSqlContainer()
    {
        if (!DockerIsAvailable())
        {
            throw new InvalidOperationException("Docker is required for this integration test. Start Docker Desktop and rerun.");
        }

        await using var database = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("identity_integration_tests")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .WithCleanUp(true)
            .Build();

        await database.StartAsync();

        var options = new DbContextOptionsBuilder<AuthDbContext>()
            .UseNpgsql(database.GetConnectionString())
            .Options;
        await using var dbContext = new AuthDbContext(options);
        await dbContext.Database.MigrateAsync();
        await SeedAsync(dbContext);

        var repository = new UserRepository(dbContext);

        var seededUser = await repository.GetByEmailAsync("seed.user@example.com");
        Assert.NotNull(seededUser);

        var createdUser = new UserModel
        {
            Username = $"integration_user_{Guid.NewGuid():N}",
            Email = $"integration_{Guid.NewGuid():N}@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("SecurePass@123"),
            Role = "Student"
        };

        await repository.AddAsync(createdUser);

        var fetchedByUsername = await repository.GetByUsernameAsync(createdUser.Username);
        Assert.NotNull(fetchedByUsername);
        Assert.Equal(createdUser.Email, fetchedByUsername!.Email);

        fetchedByUsername.Role = "Teacher";
        await repository.UpdateAsync(fetchedByUsername);

        var fetchedByEmail = await repository.GetByEmailAsync(createdUser.Email);
        Assert.NotNull(fetchedByEmail);
        Assert.Equal("Teacher", fetchedByEmail!.Role);

        await repository.DeleteAsync(fetchedByEmail.Id);

        var deleted = await repository.GetByIdAsync(fetchedByEmail.Id);
        Assert.Null(deleted);
    }

    private static bool DockerIsAvailable()
    {
        try
        {
            using var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = "info --format {{.ServerVersion}}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            process.WaitForExit(5000);
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    private static async Task SeedAsync(AuthDbContext dbContext)
    {
        if (await dbContext.Users.AnyAsync())
        {
            return;
        }

        dbContext.Users.Add(new UserModel
        {
            Username = "seed.user",
            Email = "seed.user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("SeedPass@123"),
            Role = "Student",
            IsSystemAdmin = false
        });

        await dbContext.SaveChangesAsync();
    }
}
