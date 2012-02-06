/**
 * TvNavigationController class.
 * Manages key navigation on a Webpage. Best for Navigation on TVs. Based on jQuery.
 * Inspired by googleTV KeyController https://developers.google.com/tv/web/lib/jquery/keycontroller
 *
 * @author axten
 * @version 1.0.0
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 *
 * @fileoverview Class for TvNavigationController.
 *    A page can use the TvNavigationController to manage the selection of elements with mouse or
 *    arrow keys and make sure that only one element is selected at a time. The controller can
 *    manage selection between multiple logical areas of the page, the "zones".
 *
 *    A Zone can by a single row, a single column or a grid of navigation items. In it, a zone
 *    navigates logical an wrap around (e.g. select the left item when there is no item to
 *    select when the right arrow key is pressed) at zone borders if no transition is defined.
 *
 *    To use the controller, just create an instance, add zones and call start method.
 *    If the enter key is pressed, the controller calls the click event.
 *    In grid-zones, every row need a wrapper with a css class (item_class suffixed with '_row').
 *
 * @constructor
 * @param {string} item_class The css class to select navigation items in a navigation zone,
 *     default is 'item'.
 * @param {string} active_class The css class that navigation items get if selected, default
 *     is 'selected'.
 * @param {object(keyname:keycode)} custom_key_codes The normal browser mapping is extended with
 *     these custom keycodes, e.g. { KEY_ENTER: 13 }.
 */
TvNavigationController = function(item_class, active_class, custom_key_codes)
{
    this.zones = [];
    this.active_zone = null;
    this.active_item = jQuery();
    this.active_item_index = 0;
    this.active_item_is_first = false;
    this.active_item_is_last = false;
    this.active_row_index = 0;
    this.active_row_is_first = false;
    this.active_row_is_last = false;
    this.active_item_is_first_in_row = false;
    this.active_item_is_last_in_row = false;
    this.started = false;

    this.item_class = item_class || 'item';
    this.active_class = active_class || 'selected';
    this.keycodes = {
        KEY_ENTER: 13,
        KEY_RIGHT: 39,
        KEY_LEFT: 37,
        KEY_UP: 38,
        KEY_DOWN: 40
    };

    if (custom_key_codes)
    {
        this.keycodes = jQuery.extend({}, this.keycodes, custom_key_codes);
    }
};

TvNavigationController.prototype = {
    /**
     * Starts the navigation controller. Zones can be added to the controller both before
     * and after it is started.
     * @param {jQuery.Element} initial_item Optional initial item to select. If not
     *     supplied, the first item of first zone is selected.
     * @return {boolean} True if the controller starts successfully, else false.
     */
    start: function(initial_item)
    {
        if (this.started || this.zones.length === 0)
        {
            return false;
        }

        if (initial_item && initial_item.jquery && initial_item.length > 0)
        {
            this.setSelectedItem(initial_item, this.getZoneByItem(initial_item));
        }
        else
        {
            this.setSelectedItem(this.zones[0].items.first(), this.zones[0]);
        }

        var that = this;
        jQuery(document).on('keyup.navigation_controller', function(event)
        {
            that.handleKeyPress(event.keyCode);
            event.preventDefault();
        });

        this.started = true;
        return true;
    },

    /**
     * Stops all navigation controller activity.
     */
    stop: function()
    {
        if (this.started)
        {
            jQuery(document).off('.navigation_controller');
            this.started = false;
        }
    },

    /**
     * Selects a given navigation item.
     *
     * @param {jQuery.Element} item The item to select.
     */
    selectItem: function(item)
    {
        if (this.started)
        {
            this.setSelectedItem(item, this.getZoneByItem(item));
        }
    },

    /**
     * Adds a new navigation zone to the navigation controller.
     *
     * @param {string} selector The selector of the zone to add.
     * @param {string(row||col||grid)} The type of the zone. Allowed values are 'row' for a single
     *     row, 'col' for single column and grid for a multi row grid. default is 'row'.
     * @param {object(direction:transition)} transitions The Transitons to apply to change between
     *     zones,  e.g. { left: {} }. Allowed values for direction are 'left', 'right', 'up' and
     *     'down'. Allowed values for the transiton are a jQeury.Element, a function that returns a
     *     jQuery.Element or an empty object to abort a transiton.     
     * @param {function} inner_transitions A function that returns a jQuery.Element to manipulate
     *     the inner navigation of a zone.
     */
    addZone: function(selector, type, transitions, inner_transitions)
    {
        var zone = {};
        zone.element = jQuery(selector);

        if (zone.element.length > 1)
        {
            zone.element = zone.element.first();
        }

        zone.items = jQuery('.' + this.item_class, zone.element);

        if (zone.items.length === 0)
        {
            return false;
        }

        if (type === 'grid')
        {
            var rows = jQuery('.' + this.item_class + '_row', zone.element);

            if (rows.length === 0)
            {
                return false;
            }

            zone.rows = [];
            for (var i = 0; i < rows.length; i++)
            {
                zone.rows.push(jQuery('.' + this.item_class, rows[i]));
            }
        }

        var that = this;
        zone.items.on('mouseenter.navigation_controller', function(event)
        {
            that.handleMouseEnter(jQuery(event.currentTarget));
        });

        zone.type = (type === 'row' || type === 'col' || type === 'grid') ? type : 'row';
        zone.transitions = transitions || {};
        zone.inner_transitions = inner_transitions || null;
        this.zones.push(zone);
        return true;
    },

    /***** PRIVATE METHODS ***********************************************************************/

    selectNext: function()
    {
        var next_index = (this.active_item_is_last) ? 0 : this.active_item_index + 1;
        this.setSelectedItem(this.active_zone.items.eq(next_index));
    },

    selectPrevious: function()
    {
        var previous_index = (this.active_item_is_first) ? -1 : this.active_item_index - 1;
        this.setSelectedItem(this.active_zone.items.eq(previous_index));
    },

    selectUpper: function()
    {
        var upper_row_index = (this.active_row_is_first) ? this.active_zone.rows.length - 1 : this.active_row_index - 1;
        var upper_item_row_index = (this.active_zone.rows[upper_row_index].length < this.active_item_row_index + 1)
                ? -1 : this.active_item_row_index;
        this.setSelectedItem(this.active_zone.rows[upper_row_index].eq(upper_item_row_index));
    },

    selectLower: function()
    {
        var lower_row_index = (this.active_row_is_last) ? 0 : this.active_row_index + 1;
        var lower_item_row_index = (this.active_zone.rows[lower_row_index].length < this.active_item_row_index + 1)
                ? -1 : this.active_item_row_index;
        this.setSelectedItem(this.active_zone.rows[lower_row_index].eq(lower_item_row_index));
    },

    processTransition: function(transition_item)
    {
        if (typeof transition_item === 'function')
        {
            transition_item = transition_item(this.active_item);
        }

        if (transition_item && transition_item.jquery && transition_item.length > 0)
        {
            this.setSelectedItem(transition_item, this.getZoneByItem(transition_item));
        }
    },

    setSelectedItem: function(item, zone)
    {
        if (item.length > 1)
        {
            item = item.first();
        }

        if (zone)
        {
            this.active_zone = zone;
        }
        else
        {
            if (typeof this.active_zone.inner_transitions === 'function')
            {
                item = this.active_zone.inner_transitions(this.active_item, item);
            }
        }

        if (!this.active_item || item[0] != this.active_item[0])
        {
            this.active_item.removeClass(this.active_class);
            item.addClass(this.active_class);
            item.focus();
            this.active_item = item;
            this.active_item_index = this.active_zone.items.index(item);
            this.active_item_is_first = (this.active_item_index === 0);
            this.active_item_is_last = (this.active_zone.items.length === (this.active_item_index + 1));

            if (this.active_zone.type === 'grid')
            {
                this.active_row_index = this.getRowIndexByItem(item);
                this.active_row_is_first = (this.active_row_index === 0);
                this.active_row_is_last = (this.active_zone.rows.length === (this.active_row_index + 1));
                this.active_item_row_index = this.active_zone.rows[this.active_row_index].index(item);
                this.active_item_is_first_in_row = (this.active_item_row_index === 0);
                this.active_item_is_last_in_row = (this.active_zone.rows[this.active_row_index].length === (this.active_item_row_index + 1));
            }
        }
        else
        {
            /* workaround for opera spatial navigation */
            item.focus();
        }
    },

    getZoneByItem: function(item)
    {
        for (var i = 0; i < this.zones.length; i++)
        {
            if (this.zones[i].items.is(item))
            {
                return this.zones[i];
            }
        }
    },

    getRowIndexByItem: function(item)
    {
        for (var i = 0; i < this.active_zone.rows.length; i++)
        {
            if (this.active_zone.rows[i].is(item))
            {
                return i;
            }
        }
    },

    handleKeyPress: function(keycode)
    {
        var transitions = this.active_zone.transitions;
        var is_row = (this.active_zone.type === 'row');
        var is_col = (this.active_zone.type === 'col');
        var is_grid = (this.active_zone.type === 'grid');

        if (keycode === this.keycodes.KEY_ENTER)
        {
            this.active_item.click();
        }
        else if (keycode === this.keycodes.KEY_LEFT)
        {
            if (transitions.left && (is_col || (is_row && this.active_item_is_first) || (is_grid && this.active_item_is_first_in_row)))
            {
                this.processTransition(transitions.left);
            }
            else
            {
                this.selectPrevious();
            }
        }
        else if (keycode === this.keycodes.KEY_RIGHT)
        {
            if (transitions.right && (is_col || (is_row && this.active_item_is_last) || (is_grid && this.active_item_is_last_in_row)))
            {
                this.processTransition(transitions.right);
            }
            else
            {
                this.selectNext();
            }
        }
        else if (keycode === this.keycodes.KEY_UP)
        {
            if (transitions.up && (is_row || (is_col && this.active_item_is_first) || (is_grid && this.active_row_is_first)))
            {
                this.processTransition(transitions.up);
            }
            else if (is_grid)
            {
                this.selectUpper();
            }
            else
            {
                this.selectPrevious();
            }
        }
        else if (keycode === this.keycodes.KEY_DOWN)
        {
            if (transitions.down && (is_row || (is_col && this.active_item_is_last) || (is_grid && this.active_row_is_last)))
            {
                this.processTransition(transitions.down);
            }
            else if (is_grid)
            {
                this.selectLower();
            }
            else
            {
                this.selectNext();
            }
        }
    },

    handleMouseEnter: function(item)
    {
        if (this.started)
        {
            this.setSelectedItem(item, this.getZoneByItem(item));
        }
    }
};