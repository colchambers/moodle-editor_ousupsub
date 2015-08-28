@editor @editor_ousupsub @_bug_phantomjs
Feature: ousupsub superscript button
  To format text in ousupsub, I need to use the superscript button.

  @javascript
  Scenario: Apply superscript to a string, delete it and start a new string.
    Given I log in as "admin"
    And I am on the integrated "sup" editor test page

    When I set the field "Input" to "H"
    And I select the text in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    # Delete the text
    And I press the "backspace" key in the "Input" ousupsub editor
    Then I should see "" in the "Input" ousupsub editor

    And I press the "backspace" key in the "Input" ousupsub editor
    And I press the "backspace" key in the "Input" ousupsub editor
    # Type h
    # And I press the key "72" in the "Input" ousupsub editor
    And I enter the text "H" in the "Input" ousupsub editor
    Then I should see "H" in the raw html of the "Input" ousupsub editor
