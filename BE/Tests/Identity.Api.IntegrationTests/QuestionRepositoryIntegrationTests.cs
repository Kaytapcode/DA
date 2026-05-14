using Content.Api.Data;
using Content.Api.Models;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace Identity.Api.IntegrationTests;

public sealed class QuestionRepositoryIntegrationTests
{
    [Fact]
    public async Task CreateBulkAsync_ImportsBulkQuestions_WithPostgreSqlContainer()
    {
        if (!DockerIsAvailable())
        {
            throw new InvalidOperationException(
                "Docker is required for this integration test. Start Docker Desktop and rerun.");
        }

        await using var database = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("content_integration_tests")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .WithCleanUp(true)
            .Build();

        await database.StartAsync();

        var contextOptions = new DbContextOptionsBuilder<ContentDbContext>()
            .UseNpgsql(database.GetConnectionString())
            .Options;

        await using var dbContext = new ContentDbContext(contextOptions);
        await dbContext.Database.MigrateAsync();

        var quizId = await SeedQuizAsync(dbContext);

        var repository = new QuestionRepository(dbContext);

        var questions = new List<(string, List<string>, int, string?)>
        {
            ("What is 2 + 2?", new List<string> { "3", "4", "5", "6" }, 1, "Basic arithmetic"),
            ("Capital of France?", new List<string> { "London", "Paris", "Berlin" }, 1, null),
            ("Select the prime number.", new List<string> { "4", "6", "7", "8" }, 2, "7 is prime"),
        };

        var created = await repository.CreateBulkAsync(quizId, questions);

        Assert.Equal(3, created.Count);
        Assert.All(created, q => Assert.Equal(quizId, q.QuizId));
        Assert.Equal(new[] { 0, 1, 2 }, created.Select(q => q.OrderIndex));

        var persisted = await repository.GetByQuizIdAsync(quizId);
        Assert.Equal(3, persisted.Count);

        var first = persisted[0];
        Assert.Equal("What is 2 + 2?", first.QuestionText);
        Assert.Equal("Basic arithmetic", first.Explanation);
        Assert.Equal(4, first.Options.Count);

        var correct = first.Options.Single(o => o.IsCorrect);
        Assert.Equal("4", correct.OptionText);
        Assert.Equal(1, correct.OrderIndex);

        Assert.All(persisted[1].Options, o => Assert.Equal(o.OptionText == "Paris", o.IsCorrect));
    }

    [Fact]
    public async Task CreateBulkAsync_AppendsOrderIndexAcrossBatches()
    {
        if (!DockerIsAvailable())
        {
            throw new InvalidOperationException(
                "Docker is required for this integration test. Start Docker Desktop and rerun.");
        }

        await using var database = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("content_integration_tests_order")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .WithCleanUp(true)
            .Build();

        await database.StartAsync();

        var contextOptions = new DbContextOptionsBuilder<ContentDbContext>()
            .UseNpgsql(database.GetConnectionString())
            .Options;

        await using var dbContext = new ContentDbContext(contextOptions);
        await dbContext.Database.MigrateAsync();

        var quizId = await SeedQuizAsync(dbContext);
        var repository = new QuestionRepository(dbContext);

        var batchOne = new List<(string, List<string>, int, string?)>
        {
            ("Q1", new List<string> { "A", "B" }, 0, null),
            ("Q2", new List<string> { "A", "B" }, 1, null),
        };
        var batchTwo = new List<(string, List<string>, int, string?)>
        {
            ("Q3", new List<string> { "A", "B" }, 0, null),
            ("Q4", new List<string> { "A", "B" }, 1, null),
        };

        await repository.CreateBulkAsync(quizId, batchOne);
        await repository.CreateBulkAsync(quizId, batchTwo);

        var persisted = await repository.GetByQuizIdAsync(quizId);
        Assert.Equal(4, persisted.Count);
        Assert.Equal(new[] { 0, 1, 2, 3 }, persisted.Select(q => q.OrderIndex));
        Assert.Equal(new[] { "Q1", "Q2", "Q3", "Q4" }, persisted.Select(q => q.QuestionText));
    }

    private static async Task<Guid> SeedQuizAsync(ContentDbContext dbContext)
    {
        var content = new ContentModel
        {
            Id = Guid.NewGuid(),
            Title = "Sample quiz content",
            ContentType = "QUIZ",
            Status = "DRAFT",
            CreatedAt = DateTime.UtcNow,
        };
        var quiz = new QuizModel
        {
            Id = Guid.NewGuid(),
            ContentId = content.Id,
            PassingScore = 70,
            CreatedAt = DateTime.UtcNow,
        };

        dbContext.Contents.Add(content);
        dbContext.Quizzes.Add(quiz);
        await dbContext.SaveChangesAsync();

        return quiz.Id;
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
                    CreateNoWindow = true,
                },
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
}
