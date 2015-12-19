define('asciidoc/asciidoc-handler', [
    'jquery'
], function(
    $
) {
    "use strict";
    var asciiDocViewResourceKey = 'org.christiangalsterer.bitbucket.server.bitbucket-asciidoc-plugin:asciidoc-view';

    /**
     * Extract the extension from file name
     * @param {Object} filePath - the file path object
     * @returns {string} extension of file
     */
    function getFileExtension(filePath) {
        if (filePath.extension) {
            return filePath.extension;
        }
        var splitName = filePath.name.split('.');
        return splitName[splitName.length - 1];
    }

    /**
     * @returns Raw url for file
     */
    function getRawUrl(fileChange) {
        var projectKey = fileChange.repository.project.key;
        var repoSlug = fileChange.repository.slug;
        var path = fileChange.path.components.join('/');
        var revisionId = fileChange.commitRange.untilRevision.id;

        return AJS.contextPath() + AJS.format('/projects/{0}/repos/{1}/browse/{2}?at={3}&raw',
            projectKey, repoSlug, path, encodeURIComponent(revisionId));
    }

    // Register a file-handler for asciidoc files
    return function(options) {
        var fileChange = options.fileChange;

        // Check if asciidoc file
        var extension = getFileExtension(fileChange.path);
        var isAsciidoc = false;
        if (extension.match('asciidoc|adoc|ad|asc|txt'))
            isAsciidoc = true;

        if (isAsciidoc && options.contentMode === 'diff') {
            // Not supported
        } else if (isAsciidoc && options.contentMode === 'source') {

            // Asynchronously load asciidoc-view web-resources (js/css/soy)
            var deferred = new $.Deferred();

            WRM.require('wr!' + asciiDocViewResourceKey).done(function() {
                // When web-resources successfully loaded, create a AsciiDocView
                var AsciiDocView = require('asciidoc/asciidoc-view');
                var fileUrl = getRawUrl(fileChange);
                var view = new AsciiDocView(options.$container, fileUrl);

                deferred.resolve(view);
            }).fail(function() {
                console.log('error while asynchronously loading asciidoc-view resources');
                return deferred.reject();
            });

            return deferred;
        }

        return false;
    }
});


require('bitbucket/feature/files/file-handlers').register({
    weight: 900,
    handle: function(options) {
        return require('asciidoc/asciidoc-handler').apply(this, arguments);
    }
});

