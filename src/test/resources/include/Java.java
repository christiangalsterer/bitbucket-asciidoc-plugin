package org.christiangalsterer.stash.filehooks.plugin.hook;

import com.atlassian.bitbucket.hook.HookResponse;
import com.atlassian.bitbucket.hook.repository.PreReceiveRepositoryHook;
import com.atlassian.bitbucket.hook.repository.RepositoryHookContext;
import com.atlassian.bitbucket.io.LineInputHandler;
import com.atlassian.bitbucket.repository.RefChange;
import com.atlassian.bitbucket.repository.Repository;
import com.atlassian.bitbucket.scm.CommandInputHandler;
import com.atlassian.bitbucket.scm.PluginCommandBuilderFactory;
import com.atlassian.bitbucket.scm.git.command.GitCommandBuilderFactory;
import com.atlassian.bitbucket.setting.Settings;
import com.atlassian.fugue.Pair;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import static org.christiangalsterer.stash.filehooks.plugin.hook.Predicates.*;

/**
 * Checks the size of a file in the pre-receive phase and rejects the push when the changeset contains files which exceed the configured file size limit.
 */
public class FileSizeHook implements PreReceiveRepositoryHook {

    private static final int MAX_SETTINGS = 5;
    private static final String SETTINGS_INCLUDE_PATTERN_PREFIX = "pattern-";
    private static final String SETTINGS_EXCLUDE_PATTERN_PREFIX = "pattern-exclude-";
    private static final String SETTINGS_SIZE_PREFIX = "size-";
    private static final String SETTINGS_BRANCHES_PATTERN_PREFIX = "pattern-branches-";

    private final DiffTreeService diffTreeService;
    private final PluginCommandBuilderFactory commandFactory;

    public FileSizeHook(DiffTreeService diffTreeService, GitCommandBuilderFactory commandFactory) {
        this.diffTreeService = diffTreeService;
        this.commandFactory = commandFactory;
    }

    @Override
    public boolean onReceive(@Nonnull RepositoryHookContext context, @Nonnull Collection<RefChange> refChanges,
        @Nonnull HookResponse hookResponse) {
        Repository repository = context.getRepository();
        List<FileSizeHookSetting> settings = getSettings(context.getSettings());
        Optional<Pattern> branchesPattern;

        Map<Long, Collection<String>> pathAndSizes = new HashMap<>();

        for (FileSizeHookSetting setting : settings) {
            Long maxFileSize = setting.getSize();
            branchesPattern = setting.getBranchesPattern();

            Collection<RefChange> filteredRefChanges;
            if (branchesPattern.isPresent()) {
                filteredRefChanges = refChanges.stream().filter(REF_CHANGE_NOT_DELETED).filter(REF_CHANGE_IS_NOT_TAG)
                    .filter(filterBranchesPredicate(branchesPattern.get())).collect(Collectors.toList());
            } else {
                filteredRefChanges = refChanges.stream().filter(REF_CHANGE_NOT_DELETED).filter(REF_CHANGE_IS_NOT_TAG).collect(Collectors.toList());
            }

            Iterable<Pair<String, String>> changedFiles = diffTreeService.getChangedFiles(filteredRefChanges, repository);

            final Collection<Pair<String, String>> filteredChangedFiles;
            if (setting.getExcludePattern().isPresent()) {
                filteredChangedFiles = StreamSupport.stream(changedFiles.spliterator(), false)
                    .filter(p -> setting.getIncludePattern().matcher(p.right()).matches())
                    .filter(p -> !setting.getExcludePattern().get().matcher(p.right()).matches())
                    .collect(Collectors.toList());
            } else {
                filteredChangedFiles = StreamSupport.stream(changedFiles.spliterator(), false)
                    .filter(p -> setting.getIncludePattern().matcher(p.right()).matches()).collect(Collectors.toList());
            }

            Collection<String> violatingPaths = getChanges(filteredChangedFiles, maxFileSize, repository);
            pathAndSizes.put(maxFileSize, violatingPaths);
        }

        boolean hookPassed = true;

        for (Long maxFileSize : pathAndSizes.keySet()) {
            Collection<String> paths = pathAndSizes.get(maxFileSize);
            if (paths.size() > 0) {
                hookPassed = false;
                hookResponse.out().println("=================================");
                for (String path : paths) {
                    hookResponse.out().println(String.format("File [%s] is too large. Maximum allowed file size is %s bytes.", path, maxFileSize));
                }
                hookResponse.out().println("=================================");
            }
        }

        return hookPassed;
    }

    private Collection<String> getChanges(Collection<Pair<String, String>> changedFiles, Long maxFileSize,
        Repository repository) {
        CommandInputHandler inputHandler =
            new LineInputHandler(changedFiles.stream().map(cf -> cf.left()).collect(Collectors.toList()));
        CatFileBatchCheckHandler handler = new CatFileBatchCheckHandler();
        Collection<Pair<String, Long>> catFileResult =
            commandFactory.builder(repository).command("cat-file").argument("--batch-check").inputHandler(inputHandler)
                .build(handler).call();
        Collection<String> sizeExceedingHashes =
            catFileResult.stream().filter(r -> r.right() > maxFileSize).map(Pair::left).collect(Collectors.toList());

        if (sizeExceedingHashes.isEmpty()) {
            return Collections.emptyList();
        }

        return changedFiles.stream().filter(f -> sizeExceedingHashes.contains(f.left())).map(Pair::right)
            .collect(Collectors.toList());
    }

    private List<FileSizeHookSetting> getSettings(Settings settings) {
        List<FileSizeHookSetting> configurations = new ArrayList<FileSizeHookSetting>();
        String includeRegex;
        Long size;
        String excludeRegex;
        String branchesRegex;

        for (int i = 1; i <= MAX_SETTINGS; i++) {
            includeRegex = settings.getString(SETTINGS_INCLUDE_PATTERN_PREFIX + i);
            if (includeRegex != null) {
                excludeRegex = settings.getString(SETTINGS_EXCLUDE_PATTERN_PREFIX + i);
                size = settings.getLong(SETTINGS_SIZE_PREFIX + i);
                branchesRegex = settings.getString(SETTINGS_BRANCHES_PATTERN_PREFIX + i);
                configurations.add(new FileSizeHookSetting(size, includeRegex, excludeRegex, branchesRegex));
            }
        }

        return configurations;
    }

}

