///<reference path="../../reference.ts" />

module Plottable {
  export class Axis extends Component {
    /**
     * The css class applied to each end tick mark (the line on the end tick).
     */
    public static END_TICK_MARK_CLASS = "end-tick-mark";
    /**
     * The css class applied to each tick mark (the line on the tick).
     */
    public static TICK_MARK_CLASS = "tick-mark";
    /**
     * The css class applied to each tick label (the text associated with the tick).
     */
    public static TICK_LABEL_CLASS = "tick-label";
    protected _tickMarkContainer: D3.Selection;
    protected _tickLabelContainer: D3.Selection;
    protected _baseline: D3.Selection;
    protected _scale: Scale<any, number>;
    private _formatter: Formatter;
    private _orientation: string;
    protected _computedWidth: number;
    protected _computedHeight: number;
    private _endTickLength = 5;
    private _tickLength = 5;
    private _tickLabelPadding = 10;
    private _gutter = 15;
    private _showEndTickLabels = false;
    private _rescaleCallback: ScaleCallback<Scale<any, number>>;

    /**
     * Constructs an axis. An axis is a wrapper around a scale for rendering.
     *
     * @constructor
     * @param {Scale} scale The scale for this axis to render.
     * @param {string} orientation One of ["top", "left", "bottom", "right"];
     * on which side the axis will appear. On most axes, this is either "left"
     * or "bottom".
     * @param {Formatter} Data is passed through this formatter before being
     * displayed.
     */
    constructor(scale: Scale<any, number>, orientation: string, formatter = Formatters.identity()) {
      super();
      if (scale == null || orientation == null) { throw new Error("Axis requires a scale and orientation"); }
      this._scale = scale;
      this.orientation(orientation);
      this._setDefaultAlignment();
      this.classed("axis", true);
      if (this._isHorizontal()) {
        this.classed("x-axis", true);
      } else {
        this.classed("y-axis", true);
      }

      this.formatter(formatter);

      this._rescaleCallback = (scale) => this._rescale();
      this._scale.onUpdate(this._rescaleCallback);
    }

    public destroy() {
      super.destroy();
      this._scale.offUpdate(this._rescaleCallback);
    }

    protected _isHorizontal() {
      return this._orientation === "top" || this._orientation === "bottom";
    }

    protected _computeWidth() {
      // to be overridden by subclass logic
      this._computedWidth = this._maxLabelTickLength();
      return this._computedWidth;
    }

    protected _computeHeight() {
      // to be overridden by subclass logic
      this._computedHeight = this._maxLabelTickLength();
      return this._computedHeight;
    }

    public requestedSpace(offeredWidth: number, offeredHeight: number): SpaceRequest {
      var requestedWidth = 0;
      var requestedHeight = 0;

      if (this._isHorizontal()) {
        if (this._computedHeight == null) {
          this._computeHeight();
        }
        requestedHeight = this._computedHeight + this._gutter;
      } else { // vertical
        if (this._computedWidth == null) {
          this._computeWidth();
        }
        requestedWidth = this._computedWidth + this._gutter;
      }

      return {
        minWidth: requestedWidth,
        minHeight: requestedHeight
      };
    }

    public fixedHeight() {
      return this._isHorizontal();
    }

    public fixedWidth() {
      return !this._isHorizontal();
    }

    protected _rescale() {
      // default implementation; subclasses may call redraw() here
      this.render();
    }

    public computeLayout(origin?: Point, availableWidth?: number, availableHeight?: number) {
      super.computeLayout(origin, availableWidth, availableHeight);
      if (this._isHorizontal()) {
        this._scale.range([0, this.width()]);
      } else {
        this._scale.range([this.height(), 0]);
      }
      return this;
    }

    protected _setup() {
      super._setup();
      this._tickMarkContainer = this._content.append("g")
                                            .classed(Axis.TICK_MARK_CLASS + "-container", true);
      this._tickLabelContainer = this._content.append("g")
                                             .classed(Axis.TICK_LABEL_CLASS + "-container", true);
      this._baseline = this._content.append("line").classed("baseline", true);
    }

    /*
     * Function for generating tick values in data-space (as opposed to pixel values).
     * To be implemented by subclasses.
     */
    protected _getTickValues(): any[] {
      return [];
    }

    protected _render() {
      var tickMarkValues = this._getTickValues();
      var tickMarks = this._tickMarkContainer.selectAll("." + Axis.TICK_MARK_CLASS).data(tickMarkValues);
      tickMarks.enter().append("line").classed(Axis.TICK_MARK_CLASS, true);
      tickMarks.attr(this._generateTickMarkAttrHash());
      d3.select(tickMarks[0][0]).classed(Axis.END_TICK_MARK_CLASS, true)
                                .attr(this._generateTickMarkAttrHash(true));
      d3.select(tickMarks[0][tickMarkValues.length - 1]).classed(Axis.END_TICK_MARK_CLASS, true)
                                                      .attr(this._generateTickMarkAttrHash(true));
      tickMarks.exit().remove();
      this._baseline.attr(this._generateBaselineAttrHash());
    }

    protected _generateBaselineAttrHash() {
      var baselineAttrHash = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0
      };

      switch (this._orientation) {
        case "bottom":
          baselineAttrHash.x2 = this.width();
          break;

        case "top":
          baselineAttrHash.x2 = this.width();
          baselineAttrHash.y1 = this.height();
          baselineAttrHash.y2 = this.height();
          break;

        case "left":
          baselineAttrHash.x1 = this.width();
          baselineAttrHash.x2 = this.width();
          baselineAttrHash.y2 = this.height();
          break;

        case "right":
          baselineAttrHash.y2 = this.height();
          break;
      }

      return baselineAttrHash;
    }

    protected _generateTickMarkAttrHash(isEndTickMark = false) {
      var tickMarkAttrHash = {
        x1: <any> 0,
        y1: <any> 0,
        x2: <any> 0,
        y2: <any> 0
      };

      var scalingFunction = (d: any) => this._scale.scale(d);
      if (this._isHorizontal()) {
        tickMarkAttrHash["x1"] = scalingFunction;
        tickMarkAttrHash["x2"] = scalingFunction;
      } else {
        tickMarkAttrHash["y1"] = scalingFunction;
        tickMarkAttrHash["y2"] = scalingFunction;
      }

      var tickLength = isEndTickMark ? this._endTickLength : this._tickLength;

      switch (this._orientation) {
        case "bottom":
          tickMarkAttrHash["y2"] = tickLength;
          break;

        case "top":
          tickMarkAttrHash["y1"] = this.height();
          tickMarkAttrHash["y2"] = this.height() - tickLength;
          break;

        case "left":
          tickMarkAttrHash["x1"] = this.width();
          tickMarkAttrHash["x2"] = this.width() - tickLength;
          break;

        case "right":
          tickMarkAttrHash["x2"] = tickLength;
          break;
      }

      return tickMarkAttrHash;
    }

    public redraw() {
      this._computedWidth = null;
      this._computedHeight = null;
      return super.redraw();
    }

    protected _setDefaultAlignment() {
      switch (this._orientation) {
        case "bottom":
          this.yAlignment("top");
          break;

        case "top":
          this.yAlignment("bottom");
          break;

        case "left":
          this.xAlignment("right");
          break;

        case "right":
          this.xAlignment("left");
          break;
      }
    }

    /**
     * Gets the current formatter on the axis. Data is passed through the
     * formatter before being displayed.
     *
     * @returns {Formatter} The calling Axis, or the current
     * Formatter.
     */
    public formatter(): Formatter;
    /**
     * Sets the current formatter on the axis. Data is passed through the
     * formatter before being displayed.
     *
     * @param {Formatter} formatter If provided, data will be passed though `formatter(data)`.
     * @returns {Axis} The calling Axis.
     */
    public formatter(formatter: Formatter): Axis;
    public formatter(formatter?: Formatter): any {
      if (formatter === undefined) {
        return this._formatter;
      }
      this._formatter = formatter;
      this.redraw();
      return this;
    }

    /**
     * Gets the current tick mark length.
     *
     * @returns {number} the current tick mark length.
     */
    public tickLength(): number;
    /**
     * Sets the current tick mark length.
     *
     * @param {number} length If provided, length of each tick.
     * @returns {Axis} The calling Axis.
     */
    public tickLength(length: number): Axis;
    public tickLength(length?: number): any {
      if (length == null) {
        return this._tickLength;
      } else {
        if (length < 0) {
          throw new Error("tick length must be positive");
        }
        this._tickLength = length;
        this.redraw();
        return this;
      }
    }

    /**
     * Gets the current end tick mark length.
     *
     * @returns {number} The current end tick mark length.
     */
    public endTickLength(): number;
    /**
     * Sets the end tick mark length.
     *
     * @param {number} length If provided, the length of the end ticks.
     * @returns {BaseAxis} The calling Axis.
     */
    public endTickLength(length: number): Axis;
    public endTickLength(length?: number): any {
      if (length == null) {
        return this._endTickLength;
      } else {
        if (length < 0) {
          throw new Error("end tick length must be positive");
        }
        this._endTickLength = length;
        this.redraw();
        return this;
      }
    }

    protected _maxLabelTickLength() {
      if (this.showEndTickLabels()) {
        return Math.max(this.tickLength(), this.endTickLength());
      } else {
        return this.tickLength();
      }
    }

    /**
     * Gets the padding between each tick mark and its associated label.
     *
     * @returns {number} the current padding.
     * length.
     */
    public tickLabelPadding(): number;
    /**
     * Sets the padding between each tick mark and its associated label.
     *
     * @param {number} padding If provided, the desired padding.
     * @returns {Axis} The calling Axis.
     */
    public tickLabelPadding(padding: number): Axis;
    public tickLabelPadding(padding?: number): any {
      if (padding == null) {
        return this._tickLabelPadding;
      } else {
        if (padding < 0) {
          throw new Error("tick label padding must be positive");
        }
        this._tickLabelPadding = padding;
        this.redraw();
        return this;
      }
    }

    /**
     * Gets the size of the gutter (the extra space between the tick
     * labels and the outer edge of the axis).
     *
     * @returns {number} the current gutter.
     * length.
     */
    public gutter(): number;
    /**
     * Sets the size of the gutter (the extra space between the tick
     * labels and the outer edge of the axis).
     *
     * @param {number} size If provided, the desired gutter.
     * @returns {Axis} The calling Axis.
     */
    public gutter(size: number): Axis;
    public gutter(size?: number): any {
      if (size == null) {
        return this._gutter;
      } else {
        if (size < 0) {
          throw new Error("gutter size must be positive");
        }
        this._gutter = size;
        this.redraw();
        return this;
      }
    }

    /**
     * Gets the orientation of the Axis.
     *
     * @returns {number} the current orientation.
     */
    public orientation(): string;
    /**
     * Sets the orientation of the Axis.
     *
     * @param {number} newOrientation If provided, the desired orientation
     * (top/bottom/left/right).
     * @returns {Axis} The calling Axis.
     */
    public orientation(orientation: string): Axis;
    public orientation(orientation?: string): any {
      if (orientation == null) {
        return this._orientation;
      } else {
        var newOrientationLC = orientation.toLowerCase();
        if (newOrientationLC !== "top" &&
            newOrientationLC !== "bottom" &&
            newOrientationLC !== "left" &&
            newOrientationLC !== "right") {
          throw new Error("unsupported orientation");
        }
        this._orientation = newOrientationLC;
        this.redraw();
        return this;
      }
    }

    /**
     * Gets whether the Axis is currently set to show the first and last
     * tick labels.
     *
     * @returns {boolean} whether or not the last
     * tick labels are showing.
     */
    public showEndTickLabels(): boolean;
    /**
     * Sets whether the Axis is currently set to show the first and last tick
     * labels.
     *
     * @param {boolean} show Whether or not to show the first and last
     * labels.
     * @returns {Axis} The calling Axis.
     */
    public showEndTickLabels(show: boolean): Axis;
    public showEndTickLabels(show?: boolean): any {
      if (show == null) {
        return this._showEndTickLabels;
      }
      this._showEndTickLabels = show;
      this.render();
      return this;
    }
  }
}
