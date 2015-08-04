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
