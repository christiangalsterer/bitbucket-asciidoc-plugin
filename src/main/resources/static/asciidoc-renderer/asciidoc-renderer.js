define('asciidoc/asciidoc-renderer', [
    'jquery',
    'underscore',
    'lib/asciidoctor'
], function(
    $,
    _,
    Opal
) {
 function AsciiDocRenderer($container) {
        this.$container = $container;
        this.width = this.$container.innerWidth();
        this.height = this._calculateHeight();

         _.bindAll(this, '_onWindowResize', 'render');
        $(window).on('resize', this._onWindowResize);
    }

    AsciiDocRenderer.prototype._onWindowResize = function() {
        this.height = this._calculateHeight();
        this.width = this.$container.innerWidth();
    };

    AsciiDocRenderer.prototype._calculateAspectRatio = function() {
        return this.width / this.height;
    };

    AsciiDocRenderer.prototype._calculateHeight = function() {
        var windowHeightRatio = 0.6;
        return $(window).height() * windowHeightRatio;
    };


    AsciiDocRenderer.prototype.render = function(asciiDocRawUrl) {
        var content;
        $.ajax({
            url : asciiDocRawUrl,
            async:false,
            success : function(data){
                content = data;
            },
            'error': function (xhr, status, errorMessage) {
            }
        });

        try {
            var attributes =  Opal.hash({'highlightjsdir':'http://cdn.jsdelivr.net/highlight.js/9.0.0/highlight.min.js','safe': 'unsafe', 'backend': 'html5', 'source-highlighter': 'highlightjs', 'linkcss!': '', 'copycss!': '', 'showtitle': ''});
            var options = Opal.hash({'backend':'html5', safe: 'unsafe', attributes: attributes});
            var html = Opal.Asciidoctor.$convert(content, options);
            this.$container.html(html);
        } catch (e) {
            return;
        }
    };


    AsciiDocRenderer.prototype.destroy = function() {
        $(window).off('resize', this._onWindowResize);
    };

    return AsciiDocRenderer;
});