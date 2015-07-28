@editor @editor_ousupsub @_bug_phantomjs
Feature: ousupsub superscript button
  To format text in ousupsub, I need to use the superscript button.

  @javascript
  Scenario: Superscript some text
    Given I log in as "admin"
    And I am on the integrated "sup" editor test page
    And I set the field "Input" to "Helicopter"
    And I select the text in the "Input" ousupsub editor

    #  # Verify button 94(Up arrow) applies superscript
    And I press the key "94" in the "Input" ousupsub editor
    Then I should see "<sup>Helicopter</sup>" in the "Input" ousupsub editor

    # Verify cannot add further superscript
    When I press the key "94" in the "Input" ousupsub editor
    Then I should see "<sup>Helicopter</sup>" in the "Input" ousupsub editor

    # Verify button 95(Down arrow) removes superscript
    And I press the key "95" in the "Input" ousupsub editor
    Then I should see "Helicopter" in the "Input" ousupsub editor

    # Verify button 95(Down arrow) cannot apply subscript
    And I press the key "95" in the "Input" ousupsub editor
    Then I should see "Helicopter" in the "Input" ousupsub editor

    # Verify button 38(^) applies superscript
    When I set the field "Input" to "Helicopter"
    And I select the text in the "Input" ousupsub editor
    And I press the key "38" in the "Input" ousupsub editor
    Then I should see "<sup>Helicopter</sup>" in the "Input" ousupsub editor

    # Verify button 40(_) removes superscript
    And I press the key "40" in the "Input" ousupsub editor
    Then I should see "Helicopter" in the "Input" ousupsub editor

    # Apply superscript to a string, delete it and start a new string.
    When I set the field "Input" to "H"
    And I select the text in the "Input" ousupsub editor
    And I click on "Superscript" "button"
    And I press the key "46" in the "Input" ousupsub editor
    Then I should see "" in the "Input" ousupsub editor
    And I press the key "72" in the "Input" ousupsub editor
    Then I should see "h" in the "Input" ousupsub editor
