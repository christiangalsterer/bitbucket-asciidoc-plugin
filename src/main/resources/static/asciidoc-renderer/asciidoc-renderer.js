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
        this.renderer.setSize(this.width, this.height);
    };

    AsciiDocRenderer.prototype._onFileLoaded = function(geometry) {
        geometry.computeBoundingBox();

        var maxSize = geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
        var maxLength = maxSize.length();

        // Find out how much 'y' is off (or into!) the ground, then scale y by the length
        var groundHeight = geometry.boundingBox.min.z / maxLength;

        var modelMesh = new THREE.Mesh(geometry);

        modelMesh.position.y = -groundHeight + yPlaneAdjustment;
        modelMesh.rotation.set(-Math.PI / 2, 0, 0);
        modelMesh.scale.set(1 / maxLength, 1 / maxLength, 1 / maxLength);
        this.rootObject.add(modelMesh);
        this.modelMesh = modelMesh;

        this.setMeshMode(defaultMode);
    };

    AsciiDocRenderer.prototype._calculateAspectRatio = function() {
        return this.width / this.height;
    };

    AsciiDocRenderer.prototype._calculateHeight = function() {
        var windowHeightRatio = 0.6;
        return $(window).height() * windowHeightRatio;
    };


    AsciiDocRenderer.prototype.render = function(asciiDocRawUrl) {
        var content = "http://asciidoctor.org[*Asciidoctor*] " +
            "running on http://opalrb.org[_Opal_] " +
            "brings AsciiDoc to the browser!";
        var options = Opal.hash({doctype: 'inline', attributes: ['showtitle']});
        var html = Opal.Asciidoctor.$convert(content, options);
        this.$container.html(html);

        console.log(html);
    };

    AsciiDocRenderer.prototype.destroy = function() {
        $(window).off('resize', this._onWindowResize);
        this.controls.reset();
    };

    return AsciiDocRenderer;
});