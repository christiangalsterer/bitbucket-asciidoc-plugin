define('asciidoc/asciidoc-view', [
    'jquery',
    'asciidoc/asciidoc-renderer'
], function(
    $,
    AsciiDocRenderer
) {

    /**
     * Constructs a view that renders a asciidoc file
     *
     * @param $container - container to render the asciidoc file in
     * @param asciiDocRawUrl - raw url to the asciidoc file
     * @constructor
     */
    function AsciiDocView($container, asciiDocRawUrl, commitHash) {
        this.$view = $(bitbucket.feature.fileContent.asciidoc.view());
        this.$container = $container.html(this.$view);
        this.asciiDocRenderer = new AsciiDocRenderer(this.$view);
        this.asciiDocRenderer.render(asciiDocRawUrl, commitHash);
    }

    /**
     * This will be called when the view is destroyed
     */
    AsciiDocView.prototype.destroy = function() {
        this.asciiDocRenderer.destroy();
        this.asciiDocRenderer = null;
    };

    return AsciiDocView;
});
