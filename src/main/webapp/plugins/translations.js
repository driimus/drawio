/**
 * Tags plugin.
 *
 * - Set tags via dialog
 * - Toggle hidden tags
 * - Stateless filter
 *
 * TODO:
 *
 * - Add hiddenTags to viewState of page
 * - Export to PDF ignores current tags
 * - Sync hiddenTags with removed tags
 */
Draw.loadPlugin(function (editorUi) {
  var div = document.createElement("div");

  // Adds resource for action
  mxResources.parse("langs=Filter languages");

  // Adds action
  editorUi.actions.addAction("langs...", function () {
    if (editorUi.langsWindow == null) {
      editorUi.langsWindow = new LangsWindow(
        editorUi,
        document.body.offsetWidth - 380,
        120,
        300,
        240
      );
      editorUi.langsWindow.window.addListener("show", function () {
        editorUi.fireEvent(new mxEventObject("langs"));
      });
      editorUi.langsWindow.window.addListener("hide", function () {
        editorUi.fireEvent(new mxEventObject("langs"));
      });
      editorUi.langsWindow.window.setVisible(true);
      editorUi.fireEvent(new mxEventObject("langs"));
    } else {
      editorUi.langsWindow.window.setVisible(
        !editorUi.langsWindow.window.isVisible()
      );
    }
  });

  var menu = editorUi.menus.get("extras");
  var oldFunct = menu.funct;

  menu.funct = function (menu, parent) {
    oldFunct.apply(this, arguments);

    editorUi.menus.addMenuItems(menu, ["-", "langs"], parent);
  };

  var LangsWindow = function (editorUi, x, y, w, h) {
    var graph = editorUi.editor.graph;
    var propertyName = "tags";

    var div = document.createElement("div");
    div.style.overflow = "hidden";
    div.style.padding = "12px 8px 12px 8px";
    div.style.height = "auto";

    var searchInput = document.createElement("input");
    searchInput.setAttribute(
      "placeholder",
      "Type in the tags and press Enter to add them"
    );
    searchInput.setAttribute("type", "text");
    searchInput.style.width = "100%";
    searchInput.style.boxSizing = "border-box";
    searchInput.style.fontSize = "12px";
    searchInput.style.borderRadius = "4px";
    searchInput.style.padding = "4px";
    searchInput.style.marginBottom = "8px";
    div.appendChild(searchInput);

    var filterInput = searchInput.cloneNode(true);
    filterInput.setAttribute("placeholder", "Filter tags");
    div.appendChild(filterInput);

    var tagCloud = document.createElement("div");
    tagCloud.style.position = "relative";
    tagCloud.style.fontSize = "12px";
    tagCloud.style.height = "auto";
    div.appendChild(tagCloud);

    var graph = editorUi.editor.graph;
    var lastValue = null;

    function getTagsForCell(cell) {
      return graph.getAttributeForCell(cell, propertyName, "");
    }

    function getAllTagsForCells(cells) {
      var tokens = [];
      var temp = {};

      for (var i = 0; i < cells.length; i++) {
        var tags = getTagsForCell(cells[i]);

        if (tags.length > 0) {
          var t = tags.toLowerCase().split(" ");

          for (var j = 0; j < t.length; j++) {
            if (temp[t[j]] == null) {
              temp[t[j]] = true;
              tokens.push(t[j]);
            }
          }
        }
      }

      tokens.sort();

      return tokens;
    }

    function getCommonTagsForCells(cells) {
      var commonTokens = null;
      var validTags = [];

      for (var i = 0; i < cells.length; i++) {
        var tags = getTagsForCell(cells[i]);
        validTags = [];

        if (tags.length > 0) {
          var tokens = tags.toLowerCase().split(" ");
          var temp = {};

          for (var j = 0; j < tokens.length; j++) {
            if (commonTokens == null || commonTokens[tokens[j]] != null) {
              temp[tokens[j]] = true;
              validTags.push(tokens[j]);
            }
          }

          commonTokens = temp;
        } else {
          return [];
        }
      }

      return validTags;
    }

    function getLookup(tagList) {
      var lookup = {};

      for (var i = 0; i < tagList.length; i++) {
        lookup[tagList[i].toLowerCase()] = true;
      }

      return lookup;
    }

    function getAllTags() {
      return getAllTagsForCells(
        graph.model.getDescendants(graph.model.getRoot())
      );
    }

    /**
     * Returns true if tags exist and are all in lookup.
     */
    function matchTags(tags, lookup) {
      if (tags.length > 0) {
        var tmp = tags.toLowerCase().split(" ");

        for (var i = 0; i < tmp.length; i++) {
          if (lookup[tmp[i]] == false) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    }

    var hiddenTags = { de: true, en: false };
    var graphIsCellVisible = graph.isCellVisible;

    graph.isCellVisible = function (cell) {
      return (
        graphIsCellVisible.apply(this, arguments) &&
        !matchTags(getTagsForCell(cell), hiddenTags)
      );
    };

    // function setCellsVisibleForTag(tag, visible) {
    //   var cells = graph.getCellsForTags([tag], null, propertyName, true);

    //   // Ignores layers for selection
    //   var temp = [];

    //   for (var i = 0; i < cells.length; i++) {
    //     if (graph.model.isVertex(cells[i]) || graph.model.isEdge(cells[i])) {
    //       temp.push(cells[i]);
    //     }
    //   }

    //   graph.setCellsVisible(cells, visible);
    // }

    function updateSelectedTags(tags, selected, selectedColor, filter) {
      tagCloud.innerHTML = "";

      var title = document.createElement("div");
      title.style.marginBottom = "8px";
      mxUtils.write(title, "Select language to display");
      tagCloud.appendChild(title);

      var found = 0;

      for (var i = 0; i < tags.length; i++) {
        if (filter == null || tags[i].substring(0, filter.length) == filter) {
          var span = document.createElement("span");
          span.style.display = "inline-block";
          span.style.padding = "6px 8px";
          span.style.borderRadius = "6px";
          span.style.marginBottom = "8px";
          span.style.maxWidth = "80px";
          span.style.overflow = "hidden";
          span.style.textOverflow = "ellipsis";
          span.style.cursor = "pointer";
          span.setAttribute("title", tags[i]);
          span.style.border = "1px solid #808080";
          mxUtils.write(span, tags[i]);

          if (!selected[tags[i]]) {
            span.style.background = selectedColor;
            span.style.color = "#ffffff";
          } else {
            span.style.background =
              uiTheme == "dark" ? "transparent" : "#ffffff";
          }

          mxEvent.addListener(
            span,
            "click",
            (function (tag) {
              return function () {
                if (selected[tag]) {
                  Object.keys(hiddenTags).forEach(
                    (tag) => (hiddenTags[tag] = true)
                  );
                  hiddenTags[tag] = false;
                  refreshUi();

                  window.setTimeout(function () {
                    graph.refresh();
                  }, 0);
                }
              };
            })(tags[i])
          );

          tagCloud.appendChild(span);
          mxUtils.write(tagCloud, " ");
          found++;
        }
      }

      if (found == 0) {
        mxUtils.write(tagCloud, "No tags found");
      }
    }

    function updateTagCloud(tags) {
      updateSelectedTags(tags, hiddenTags, "#bb0000", filterInput.value);
    }

    function refreshUi() {
      if (graph.isSelectionEmpty()) {
        updateTagCloud(getAllTags(), hiddenTags);
        searchInput.style.display = "none";
        filterInput.style.display = "";
      } else {
        updateSelectedTags(
          getAllTags(),
          getLookup(getCommonTagsForCells(graph.getSelectionCells())),
          "#2873e1"
        );
        searchInput.style.display = "";
        filterInput.style.display = "none";
      }
    }

    refreshUi();

    graph.selectionModel.addListener(mxEvent.EVENT_CHANGE, function (
      sender,
      evt
    ) {
      refreshUi();
    });

    graph.model.addListener(mxEvent.EVENT_CHANGE, function (sender, evt) {
      refreshUi();
    });

    mxEvent.addListener(filterInput, "keyup", function () {
      updateTagCloud(getAllTags());
    });

    this.window = new mxWindow(
      "Filter translations",
      div,
      x,
      y,
      w,
      null,
      true,
      true
    );
    this.window.destroyOnClose = false;
    this.window.setMaximizable(false);
    this.window.setResizable(true);
    this.window.setScrollable(true);
    this.window.setClosable(true);
    this.window.contentWrapper.style.overflowY = "scroll";

    this.window.addListener(
      "show",
      mxUtils.bind(this, function () {
        this.window.fit();
        // hiddenTags = getAllTags().reduce((obj, tag) => {
        //   obj[tag] = tag === "en";
        // }, {});
        if (this.window.isVisible()) {
          searchInput.focus();

          if (
            mxClient.IS_GC ||
            mxClient.IS_FF ||
            document.documentMode >= 5 ||
            mxClient.IS_QUIRKS
          ) {
            searchInput.select();
          } else {
            document.execCommand("selectAll", false, null);
          }
        } else {
          graph.container.focus();
        }
      })
    );

    this.window.setLocation = function (x, y) {
      var iw =
        window.innerWidth ||
        document.body.clientWidth ||
        document.documentElement.clientWidth;
      var ih =
        window.innerHeight ||
        document.body.clientHeight ||
        document.documentElement.clientHeight;

      x = Math.max(0, Math.min(x, iw - this.table.clientWidth));
      y = Math.max(0, Math.min(y, ih - this.table.clientHeight - 48));

      if (this.getX() != x || this.getY() != y) {
        mxWindow.prototype.setLocation.apply(this, arguments);
      }
    };

    var resizeListener = mxUtils.bind(this, function () {
      var x = this.window.getX();
      var y = this.window.getY();

      this.window.setLocation(x, y);
    });

    mxEvent.addListener(window, "resize", resizeListener);

    this.destroy = function () {
      mxEvent.removeListener(window, "resize", resizeListener);
      this.window.destroy();
    };
  };
});
